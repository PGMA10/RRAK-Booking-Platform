import { IStorage } from "./storage";
import { unlink } from "fs/promises";
import path from "path";

const EXPIRATION_MINUTES = 15;
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export function startBookingExpirationService(storage: IStorage) {
  console.log(`⏰ Starting booking expiration service (${EXPIRATION_MINUTES} minute timeout)`);
  
  const checkExpiredBookings = async () => {
    try {
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() - EXPIRATION_MINUTES * 60 * 1000);
      
      // Get all bookings
      const allBookings = await storage.getAllBookings();
      
      // Find pending bookings that have expired
      const expiredBookings = allBookings.filter(booking => {
        // Must be pending payment and older than 15 minutes (based on pendingSince timestamp)
        if (booking.paymentStatus !== 'pending') return false;
        if (booking.status === 'cancelled') return false; // Already cancelled
        if (!booking.pendingSince) return false;
        
        const pendingSince = booking.pendingSince instanceof Date ? booking.pendingSince : new Date(booking.pendingSince);
        return pendingSince < expirationThreshold;
      });
      
      if (expiredBookings.length > 0) {
        console.log(`🧹 Found ${expiredBookings.length} expired pending booking(s), cleaning up...`);
        
        for (const booking of expiredBookings) {
          try {
            // Re-fetch the booking to check if status changed since initial filter
            // This prevents race condition where payment completes during the same minute
            const latestBooking = await storage.getBookingById(booking.id);
            
            if (!latestBooking || latestBooking.paymentStatus !== 'pending' || latestBooking.status === 'cancelled') {
              console.log(`  ⏭️  Skipping booking ${booking.id} - status changed (likely paid during this check)`);
              continue;
            }
            
            // Cancel the booking (no refund since it was never paid)
            const cancelledBooking = await storage.cancelBooking(booking.id, {
              refundAmount: 0,
              refundStatus: 'no_refund',
            });
            
            // Only clean up files if cancellation succeeded
            if (cancelledBooking) {
              // Clean up any uploaded artwork files using fresh booking data
              if (latestBooking.artworkFilePath) {
                try {
                  const filePath = path.join(process.cwd(), latestBooking.artworkFilePath);
                  await unlink(filePath);
                  console.log(`  ✅ Deleted artwork file: ${latestBooking.artworkFilePath}`);
                } catch (err) {
                  // File might already be deleted, ignore
                }
              }
              
              // Clean up logo files
              if (latestBooking.logoFilePath) {
                try {
                  const filePath = path.join(process.cwd(), latestBooking.logoFilePath);
                  await unlink(filePath);
                  console.log(`  ✅ Deleted logo file: ${latestBooking.logoFilePath}`);
                } catch (err) {
                  // File might already be deleted, ignore
                }
              }
              
              // Clean up optional image files
              if (latestBooking.optionalImagePath) {
                try {
                  const filePath = path.join(process.cwd(), latestBooking.optionalImagePath);
                  await unlink(filePath);
                  console.log(`  ✅ Deleted image file: ${latestBooking.optionalImagePath}`);
                } catch (err) {
                  // File might already be deleted, ignore
                }
              }
              
              console.log(`  ✅ Expired and cancelled booking ${booking.id} (pending since ${latestBooking.pendingSince?.toISOString()})`);
            }
          } catch (error) {
            console.error(`  ❌ Error expiring booking ${booking.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in booking expiration check:", error);
    }
  };
  
  // Run initial check immediately
  checkExpiredBookings();
  
  // Then check every minute
  const intervalId = setInterval(checkExpiredBookings, CHECK_INTERVAL_MS);
  
  return () => {
    clearInterval(intervalId);
    console.log("⏰ Booking expiration service stopped");
  };
}
