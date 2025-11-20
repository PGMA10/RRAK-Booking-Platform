import { IStorage } from "./storage";
import { unlink } from "fs/promises";
import path from "path";

const EXPIRATION_MINUTES = 15;
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

// Singleton guard to prevent multiple instances
let expirationServiceHandle: { stop: () => void; running: boolean } | null = null;

export function startBookingExpirationService(storage: IStorage) {
  // Prevent multiple instances
  if (expirationServiceHandle && expirationServiceHandle.running) {
    console.log(`⚠️  [Expiration] Service already running, skipping duplicate start`);
    return expirationServiceHandle.stop;
  }

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
            
            // Attempt to cancel the booking (no refund since it was never paid)
            const cancelResult = await storage.cancelBooking(booking.id, {
              refundAmount: 0,
              refundStatus: 'no_refund',
            });
            
            if (!cancelResult) {
              console.log(`  ⚠️  Failed to cancel booking ${booking.id}`);
              continue;
            }
            
            const { booking: cancelledBooking, cancelledNow } = cancelResult;
            
            // If booking was already cancelled, skip file cleanup
            if (!cancelledNow) {
              console.log(`  ℹ️  Booking ${booking.id} was already cancelled`);
              continue;
            }
            
            // Re-fetch booking after cancellation to verify final state
            const finalBooking = await storage.getBookingById(booking.id);
            
            // Only delete files if booking is still cancelled and payment is still pending
            // This prevents deleting files if payment completed during cancellation
            if (!finalBooking || finalBooking.status !== 'cancelled' || finalBooking.paymentStatus === 'paid') {
              console.log(`  ⏭️  Skipping file cleanup for booking ${booking.id} - state changed after cancellation`);
              continue;
            }
            
            // Additional safety: Verify file paths were cleared by cancelBooking
            // If paths are not null, it means new files were uploaded (race condition), don't delete
            if (finalBooking.artworkFilePath || finalBooking.logoFilePath || finalBooking.optionalImagePath) {
              console.log(`  ⏭️  Skipping file cleanup for booking ${booking.id} - new files detected after cancellation`);
              continue;
            }
            
            // Release loyalty discount if one was reserved for this booking
            if (latestBooking.loyaltyDiscountApplied) {
              try {
                const user = await storage.getUser(latestBooking.userId);
                if (user) {
                  await storage.updateUserLoyalty(latestBooking.userId, {
                    loyaltyDiscountsAvailable: user.loyaltyDiscountsAvailable + 1,
                  });
                  console.log(`  🎟️  Released reserved loyalty discount. User ${latestBooking.userId} now has ${user.loyaltyDiscountsAvailable + 1} available`);
                }
              } catch (err) {
                console.error(`  ❌ Failed to release loyalty discount:`, err);
              }
            }
            
            // Collect file paths from latestBooking (before they were cleared by cancelBooking)
            const filesToDelete = [
              latestBooking.artworkFilePath,
              latestBooking.logoFilePath,
              latestBooking.optionalImagePath,
            ].filter((filePath): filePath is string => !!filePath);
            
            // Clean up files safely
            for (const filePath of filesToDelete) {
              try {
                const fullPath = path.join(process.cwd(), filePath);
                await unlink(fullPath);
                console.log(`  ✅ Deleted file: ${filePath}`);
              } catch (err) {
                // File might already be deleted, ignore
              }
            }
            
            console.log(`  ✅ Expired and cancelled booking ${booking.id} (pending since ${latestBooking.pendingSince?.toISOString()})`);
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
  
  const stop = () => {
    clearInterval(intervalId);
    if (expirationServiceHandle) {
      expirationServiceHandle.running = false;
    }
    console.log("⏰ Booking expiration service stopped");
  };
  
  // Store handle for singleton guard
  expirationServiceHandle = { stop, running: true };
  
  return stop;
}
