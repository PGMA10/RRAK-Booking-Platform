import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MarketingContractPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-blue-600 text-white">
            <CardTitle className="text-2xl font-bold text-center">
              Route Reach AK Marketing Contract
            </CardTitle>
            <p className="text-center text-blue-100 mt-2">Version 2025</p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)] p-8">
              <div className="prose prose-sm max-w-none">
                <h1 className="text-xl font-bold mb-4 text-center">MARKETING CONTRACT</h1>
                
                <p className="text-sm text-gray-600 mb-4">
                  THIS MARKETING CONTRACT (the "Contract") is dated this ________ day of
                  ________________, ________.
                </p>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-2">BETWEEN:</h2>
                  <div className="ml-4">
                    <p className="font-semibold">CLIENT</p>
                    <p>______________________</p>
                    <p>______________________________</p>
                    <p>(the "Client")</p>
                  </div>

                  <p className="font-bold mt-4 mb-2">AND:</p>
                  <div className="ml-4">
                    <p className="font-semibold">MARKETER</p>
                    <p>PGMA LLC DBA Route Reach AK</p>
                    <p>750 W Dimond Blvd</p>
                    <p>Ste 103 PMB 1137</p>
                    <p>Anchorage, AK 99515</p>
                    <p>(the "Marketer")</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-2">BACKGROUND</h2>
                  <p className="mb-2">A. The Client is of the opinion that the Marketer has the necessary qualifications, experience and abilities to provide marketing services to the Client.</p>
                  <p className="mb-2">B. The Marketer is agreeable to providing such marketing services to the Client on the terms and conditions set out in this Contract.</p>
                  <p>IN CONSIDERATION OF the matters described above and of the mutual benefits and obligations set forth in this Contract, the receipt and sufficiency of which consideration is hereby acknowledged, the Client and the Marketer (individually the "Party" and collectively the "Parties" to this Contract) agree as follows:</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">DEFINITIONS</h2>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>The "Business" refers to the goods and/or services offered by the Client as described in the booking confirmation email.</li>
                    <li>"Print Deadline" means seven (7) calendar days prior to the Mail Date.</li>
                    <li>"Mail Date" means the date the postcards are delivered to USPS for distribution.</li>
                    <li>"Turnkey Services" means the complete service package including slot reservation, professional design services, printing coordination, and mail distribution.</li>
                    <li>"Booking Confirmation" means the electronic confirmation sent to Client upon successful payment, containing all campaign details including geographic area, number of households, industry category, and mail date.</li>
                  </ol>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">SERVICES PROVIDED</h2>
                  <p className="mb-2"><strong>6.</strong> The Client hereby agrees to engage the Marketer to provide the Client with the following marketing services (the "Services"):</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Marketing and advertisement for the promotion of the Business;</li>
                    <li>Conduct the necessary research to understand the Client's needs and implement marketing strategies based on that research;</li>
                    <li>Work with other teams in the company as required;</li>
                    <li>The Marketer shall provide direct mail advertising services, which include securing a designated advertising slot on a collaborative postcard mailer, coordinating its production, and overseeing its distribution to a specified number of households within a predetermined geographic area. The specific details of each mailing, including the geographic area, number of households, number of participating businesses, and Client's assigned industry category, shall be confirmed in the booking confirmation email sent upon successful payment;</li>
                    <li>Provide professional postcard design services as part of the turnkey package, including:
                      <ul className="list-disc list-inside ml-6 mt-1">
                        <li>Initial design concept based on Client's branding and messaging</li>
                        <li>Up to two (2) rounds of revisions at no additional cost</li>
                        <li>Final print-ready artwork in required specifications</li>
                        <li>Client retains full ownership of final approved design upon payment</li>
                      </ul>
                    </li>
                  </ul>
                  <p className="mt-2"><strong>7.</strong> The Services will also include any other marketing tasks which the Parties may agree on. The Marketer hereby agrees to provide such Services to the Client.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">DESIGN APPROVAL PROCESS</h2>
                  <p className="mb-2"><strong>8.</strong> The Marketer will provide initial design concept within five (5) business days of receiving Client's content and branding materials.</p>
                  <p className="mb-2"><strong>9.</strong> Client must approve or request revisions within forty-eight (48) hours of receiving design mockup. Failure to respond within this timeframe will result in automatic approval of the design.</p>
                  <p className="mb-2"><strong>10.</strong> Client is entitled to two (2) rounds of revisions at no additional charge. Revisions are limited to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Text edits</li>
                    <li>Color adjustments</li>
                    <li>Image substitutions</li>
                    <li>Layout modifications</li>
                  </ul>
                  <p className="mt-2 mb-2"><strong>11.</strong> Additional revisions beyond two rounds will incur a fee of fifty dollars ($50) per revision round.</p>
                  <p><strong>12.</strong> Final design must be approved at least seventy-two (72) hours before the Print Deadline to ensure timely printing and mailing. Late approvals may result in delay to next available mail date. Exceptions may be made at Marketer's discretion for clients onboarded close to the Print Deadline.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">TERM OF CONTRACT</h2>
                  <p className="mb-2"><strong>13.</strong> The term of this Contract (the "Term") will begin on the execution of this Contract and will remain in full force and effect until the completion of the Services, subject to earlier termination as provided in this Contract. The Term may be extended with the written consent of the Parties.</p>
                  <p className="mb-2"><strong>14.</strong> In the event that either Party wishes to terminate this Contract prior to the completion of the Services, that Party can do so by serving written notice on the other Party. Client may cancel bookings immediately through the Route Reach AK booking platform, which provides automatic notification to Marketer.</p>
                  <p><strong>15.</strong> In the event that either Party breaches a material provision under this Contract, the non-defaulting Party may terminate this Contract immediately and require the defaulting Party to indemnify the non-defaulting Party against all reasonable damages.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">COMPENSATION</h2>
                  <p className="mb-2"><strong>16.</strong> The Marketer will charge the Client a fee for the Services (the "Compensation") according to the following fee structure:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>First advertising slot: Six hundred dollars ($600)</li>
                    <li>Each additional slot in same booking: Five hundred dollars ($500)</li>
                    <li>Professional design services: Included at no additional charge</li>
                  </ul>
                  <p className="mt-2 mb-2">Total amount due is calculated at time of booking and must be paid in full upfront via Stripe payment processing to secure the advertising slot(s).</p>
                  <p><strong>17.</strong> The Parties acknowledge that they will each be solely responsible for the federal, state and local taxes and duties that may apply to them.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">REIMBURSEMENT OF EXPENSES</h2>
                  <p><strong>18.</strong> The Client will reimburse the Marketer from time to time for reasonable and necessary expenses incurred by the Marketer in connection with providing the Services (the "Expenses"). The Marketer will only be reimbursed for Expenses submitted according to the following guidelines: the Marketer shall not incur any expenses over fifty dollars ($50) on the Client's behalf without prior written authorization.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">CONFIDENTIALITY</h2>
                  <p className="mb-2"><strong>19.</strong> Trade secrets (the "Trade Secrets") include, but are not limited to, any data or information, technique or process, tool or mechanism, formula or compound, pattern or test results relating to the business of the Client, which are secret and proprietary to the Client, and which give the business a competitive advantage where the release of that Trade Secret could be reasonably expected to cause harm to the Client.</p>
                  <p className="mb-2"><strong>20.</strong> Confidential information (the "Confidential Information") refers to any data or information relating to the Client, whether business or personal, which would reasonably be considered to be private or proprietary to the Client. Confidential Information includes, but is not limited to, accounting records, Trade Secrets, business processes and client records, and that is not generally known, and where the release of that Confidential Information could be reasonably expected to cause harm to the Client.</p>
                  <p className="mb-2"><strong>21.</strong> The Marketer agrees that they will not disclose, divulge, reveal, report or use, for any purpose, any Confidential Information which the Marketer has obtained, except as authorized by the Client or as required by law. The obligations of confidentiality will apply during the Term and will survive indefinitely upon termination of this Contract.</p>
                  <p><strong>22.</strong> All written and oral information and material disclosed or provided by the Client to the Marketer under this Contract is Confidential Information regardless of whether it was provided before or after the date of this Contract or how it was provided to the Marketer.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">OWNERSHIP OF INTELLECTUAL PROPERTY</h2>
                  <p className="mb-2"><strong>23.</strong> Upon full payment, Client owns all rights to their specific advertisement design created by Marketer, including the right to use, modify, and reproduce the design for any purpose.</p>
                  <p className="mb-2"><strong>24.</strong> The overall concept, design, layout, and format of the collaborative postcard mailer (the "Mailer") remain the sole intellectual property of Route Reach AK.</p>
                  <p><strong>25.</strong> Client grants Marketer a perpetual, royalty-free license to use the completed Mailer (including Client's advertisement) in Marketer's portfolio, marketing materials, and promotional content.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">RETURN OF PROPERTY</h2>
                  <p className="mb-2"><strong>26.</strong> Upon the expiration or termination of this Contract, the Marketer will return to the Client any property, documentation, records, or Confidential Information which is the property of the Client, and will permanently delete from their computer systems all Confidential Information and proprietary information which is the property of the Client.</p>
                  <p><strong>27.</strong> In the event that this Contract is terminated by the Client prior to completion of the Services, the Marketer will be entitled to recovery from the site or premises where the Services were carried out, of any materials or equipment which is the property of the Marketer or, where agreed between the Parties, to compensation in lieu of recovery.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">INDEPENDENT CONTRACTOR</h2>
                  <p><strong>28.</strong> In providing the Services under this Contract it is expressly agreed that the Marketer is acting as an independent contractor and not as an employee. The Marketer and the Client acknowledge that this Contract does not create a partnership or joint venture between them, and is exclusively a contract for service. The Client is not required to pay, or make any contributions to, any social security, local, state or federal tax, unemployment compensation, workers' compensation, insurance premium, profit-sharing, pension or any other employee benefit for the Marketer during the Term. The Marketer is responsible for paying, and complying with reporting requirements for, all local, state and federal taxes related to payments made to the Marketer under this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">LICENSING</h2>
                  <p className="mb-2"><strong>29.</strong> The Marketer will comply with all legal licensing requirements, and will provide proof of such licensing immediately upon the Client's request.</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>PGMA LLC DBA Route Reach AK has the following license: 2198786</li>
                    <li>Registered Agent: 821 N ST STE 102, Anchorage, AK 99501</li>
                  </ul>
                  <p className="mt-2"><strong>30.</strong> Either Party providing marketing material to the other during the course of this Contract must ensure that any third party licensing requirements are complied with.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">TRADEMARKS</h2>
                  <p><strong>31.</strong> Should the Marketer develop any trademarks for the Client, the Client will be responsible for ensuring the availability of the trademark and for registering the trademark.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">RIGHT OF SUBSTITUTION</h2>
                  <p className="mb-2"><strong>32.</strong> Except as otherwise provided in this Contract, the Marketer may, at the Marketer's absolute discretion, engage a third party sub-contractor to perform some or all of the obligations of the Marketer under this Contract and the Client will not hire or engage any third parties to assist with the provision of the Services.</p>
                  <p className="mb-2"><strong>33.</strong> In the event that the Marketer hires a sub-contractor:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>the Marketer will pay the sub-contractor for its services and the Compensation will remain payable by the Client to the Marketer; and</li>
                    <li>for the purposes of the indemnification clause of this Contract, the sub-contractor is an agent of the Marketer.</li>
                  </ul>
                  <p className="mt-2"><strong>34.</strong> All employees and subcontractors, if any, employed by the Marketer in the exercise of the Services under this Contract will be bound by the terms of this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">AUTONOMY</h2>
                  <p><strong>35.</strong> Except as otherwise provided in this Contract, the Marketer will have full control over working time, methods, and decision making in relation to provision of the Services in accordance with the Contract. The Marketer will work autonomously and not at the direction of the Client. However, the Marketer will be responsive to the reasonable needs and concerns of the Client.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">EQUIPMENT</h2>
                  <p><strong>36.</strong> Except as otherwise provided in this Contract, the Marketer will provide at the Marketer's own expense, any and all tools, equipment, software, materials and any other supplies necessary to deliver the Services in accordance with the Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">NO EXCLUSIVITY</h2>
                  <p><strong>37.</strong> The Parties acknowledge that this Contract is non-exclusive and that either Party will be free, during and after the Term, to engage or contract with third parties for the provision of services similar to the Services.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">NOTICE</h2>
                  <p className="mb-2"><strong>38.</strong> All notices, requests, demands or other communications required or permitted by the terms of this Contract will be given in writing and delivered to the Parties at the following addresses:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>patrick@routereachak.com</li>
                    <li>PGMA LLC DBA Route Reach AK, 750 W Dimond Blvd, Ste 103 PMB 1137, Anchorage, AK 99515</li>
                  </ul>
                  <p className="mt-2">or to such other address as either Party may from time to time notify the other, and will be deemed to be properly delivered: (a) immediately upon being sent via email, (b) immediately upon being served personally, (c) two days after being deposited with the postal service if served by registered mail, or (d) the following day after being deposited with an overnight courier.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">INDEMNIFICATION</h2>
                  <p><strong>39.</strong> Except to the extent paid in settlement from any applicable insurance policies, and to the extent permitted by applicable law, each Party agrees to indemnify and hold harmless the other Party, and its respective directors, shareholders, affiliates, officers, agents, employees, and permitted successors and assigns against any and all claims, losses, damages, liabilities, penalties, punitive damages, expenses, reasonable legal fees and costs of any kind or amount whatsoever, which result from or arise out of any act or omission of the indemnifying party, its respective directors, shareholders, affiliates, officers, agents, employees, and permitted successors and assigns that occurs in connection with this Contract. This indemnification will survive the termination of this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">REFUND POLICY</h2>
                  <p className="mb-2"><strong>40.</strong> Client-Initiated Cancellations:</p>
                  <p className="ml-4 mb-2">Cancellations made seven (7) or more days before the Print Deadline will receive a full refund minus payment processing fees (approximately 3% of total amount paid).</p>
                  <p className="ml-4 mb-2">Cancellations made less than seven (7) days before the Print Deadline are not eligible for refund, as Marketer will have committed resources to printing and slot reservation.</p>
                  
                  <p className="mb-2"><strong>41.</strong> Marketer-Initiated Cancellations:</p>
                  <p className="ml-4 mb-2">If Marketer cancels a booking for any reason not caused by Client's breach of contract, Client will receive a full refund of all amounts paid, including payment processing fees, within five (5) business days.</p>
                  
                  <p className="mb-2"><strong>42.</strong> Wrong Slot Selection:</p>
                  <p className="ml-4 mb-2">Client is solely responsible for selecting the correct campaign, route, and industry category at time of booking. The booking system prevents double-booking and displays all available options clearly. If Client selects incorrect slot and Marketer must cancel their booking, standard cancellation fees apply (refund minus processing fees if 7+ days before Print Deadline).</p>
                  
                  <p className="mb-2"><strong>43.</strong> Route Reach AK reserves the right to issue full refunds (including processing fees) at its sole discretion on a case-by-case basis as a gesture of goodwill.</p>
                  
                  <p><strong>44.</strong> Refunds are processed to the original payment method within 5-10 business days.</p>
                </div>

                <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                  <h2 className="font-bold text-lg mb-3">CUSTOMER LOYALTY PROGRAM</h2>
                  <p className="mb-2"><strong>45.</strong> Earn $150 Off Your Next Campaign:</p>
                  <p className="ml-4 mb-2">Book three (3) separate marketing campaigns with Route Reach AK, paying the standard first-slot rate of six hundred dollars ($600) per campaign. Upon completion of your third qualifying campaign, you will receive a one hundred fifty dollar ($150) discount on your next first-slot purchase (pay $450 instead of $600).</p>
                  
                  <p className="mb-2"><strong>46.</strong> What Counts as a Qualifying Campaign:</p>
                  <ul className="list-none ml-4 space-y-1">
                    <li>✓ First advertising slot purchased at standard rate ($600)</li>
                    <li>✗ Additional slots purchased within the same campaign ($500 rate)</li>
                    <li>✗ Campaigns booked at promotional or discounted rates</li>
                    <li>✗ 3-month commitment bookings (different reward structure)</li>
                  </ul>
                  
                  <p className="mb-2 mt-2"><strong>47.</strong> Reward Details:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Discount applies only to the first slot of your next campaign</li>
                    <li>Additional slots in the discounted campaign remain at $500 each</li>
                    <li>This reward repeats every three (3) qualifying campaign bookings</li>
                    <li>Discount is automatically applied when you're eligible</li>
                    <li>Discount cannot be combined with other promotional offers</li>
                    <li>Discount has no cash value</li>
                  </ul>
                </div>

                <div className="mb-6 bg-green-50 p-4 rounded-lg">
                  <h2 className="font-bold text-lg mb-3">3-MONTH COMMITMENT PROGRAM</h2>
                  <p className="mb-2"><strong>48.</strong> Best Value Option:</p>
                  <p className="ml-4 mb-2">Book three (3) campaigns in advance for a discounted rate of one thousand five hundred dollars ($1,500), saving three hundred dollars ($300) compared to month-to-month pricing.</p>
                  
                  <p className="mb-2"><strong>49.</strong> Upon completion of your 3-month commitment, you remain eligible for the Customer Loyalty Program and can earn the $150 discount on future bookings.</p>
                  
                  <p><strong>50.</strong> Discounts from the 3-Month Commitment Program and the Customer Loyalty Program cannot be combined in a single transaction.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">TERMINATION FOR CONVENIENCE</h2>
                  <p><strong>51.</strong> Either party may terminate this agreement at any time with zero (0) days' written notice. In the event of termination by the Client, refunds will be issued according to the Refund Policy outlined in this Contract. In the event of termination by the Marketer for any reason other than Client's breach, Marketer shall provide a full refund of any fees paid for services not yet rendered.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">RIGHT TO REJECT CONTENT</h2>
                  <p className="mb-2"><strong>52.</strong> Route Reach AK reserves the right to reject any advertisement deemed:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Inappropriate for community standards</li>
                    <li>Misleading or false</li>
                    <li>Violating local, state, or federal regulations</li>
                    <li>Promoting illegal activities</li>
                  </ul>
                  <p className="mt-2">Full refund provided if content rejected before printing.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">LIMITATION OF LIABILITY</h2>
                  <p className="mb-2"><strong>53.</strong> Route Reach AK's liability is limited to the amount paid for the advertising slot. Route Reach AK is not responsible for:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>USPS delivery delays or issues</li>
                    <li>Printing errors beyond our control</li>
                    <li>Client's return on investment or sales results</li>
                    <li>Weather-related delivery delays</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">FORCE MAJEURE</h2>
                  <p className="mb-2"><strong>54.</strong> Route Reach AK is not liable for delays caused by circumstances beyond our control including but not limited to: natural disasters, postal service interruptions, printing equipment failures, or government regulations.</p>
                  <p><strong>55.</strong> No liability will be imposed on the Marketer if the performance of this Contract is impeded due to circumstances beyond the Marketer's reasonable control such as due to acts of God, pandemics or other public health crises, storms or other environmental disasters, fires, thefts, vandalism, riots, national emergencies, government acts or orders, labor disputes and supplier failures. The Marketer must promptly notify the Client of such event in writing, and must use all reasonable efforts to avoid or remove the causes of non-performance.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">MODIFICATION OF CONTRACT</h2>
                  <p><strong>56.</strong> Any amendment or modification of this Contract or additional obligation assumed by either Party in connection with this Contract will only be binding if evidenced in writing signed by each Party or an authorized representative of each Party.</p>
                </div>

                <div className="mb-6 bg-yellow-50 p-4 rounded-lg">
                  <h2 className="font-bold text-lg mb-3">DIGITAL SIGNATURE AND ACCEPTANCE</h2>
                  <p><strong>57.</strong> The Parties agree that electronic acceptance via checkbox on the Route Reach AK booking platform constitutes a legally binding signature equivalent to a handwritten signature. Timestamp of acceptance serves as proof of execution of this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">TIME OF THE ESSENCE</h2>
                  <p><strong>58.</strong> Time is of the essence in this Contract. No extension or variation of this Contract will operate as a waiver of this provision.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">ASSIGNMENT</h2>
                  <p><strong>59.</strong> The Marketer will not voluntarily, or by operation of law, assign or otherwise transfer its obligations under this Contract without the prior, written consent of the Client.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">ENTIRE AGREEMENT</h2>
                  <p><strong>60.</strong> It is agreed that there is no representation, warranty, collateral agreement or condition affecting this Contract except as expressly provided in this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">ENUREMENT</h2>
                  <p><strong>61.</strong> This Contract will enure to the benefit of and be binding on the Parties and their respective heirs, executors, administrators and permitted successors and assigns.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">SURVIVAL CLAUSE</h2>
                  <p><strong>62.</strong> The following sections shall survive termination of this Contract: Confidentiality, Indemnification, Ownership of Intellectual Property, and Limitation of Liability.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">DISPUTE RESOLUTION</h2>
                  <p><strong>63.</strong> Any disputes arising from this Contract shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in Anchorage, Alaska under the rules of the American Arbitration Association. Each party bears their own costs of arbitration.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">TITLES/HEADINGS</h2>
                  <p><strong>64.</strong> Headings are inserted for the convenience of the Parties only and are not to be considered when interpreting this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">GENDER</h2>
                  <p><strong>65.</strong> Words in the singular mean and include the plural and vice versa. Words in the masculine mean and include the feminine and vice versa.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">GOVERNING LAW</h2>
                  <p><strong>66.</strong> This Contract will be governed by and construed in accordance with the laws of the State of Alaska.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">SEVERABILITY</h2>
                  <p><strong>67.</strong> In the event that any of the provisions of this Contract are held to be invalid or unenforceable in whole or in part, all other provisions will nevertheless continue to be valid and enforceable with the invalid or unenforceable parts severed from the remainder of this Contract.</p>
                </div>

                <div className="mb-6">
                  <h2 className="font-bold text-lg mb-3">WAIVER</h2>
                  <p><strong>68.</strong> The waiver by either Party of a breach, default, delay or omission of any of the provisions of this Contract by the other Party will not be construed as a waiver of any subsequent breach of the same or other provisions.</p>
                </div>

                <div className="border-t pt-6 mt-8 text-center text-sm text-gray-600">
                  <p className="mb-4">IN WITNESS WHEREOF the Parties have duly affixed their signatures under hand and seal on this ________ day of ________________, ________.</p>
                  <p className="mt-6">©2002-2025 LawDepot.com®</p>
                  <p>Route Reach AK Revision - January 2025</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
