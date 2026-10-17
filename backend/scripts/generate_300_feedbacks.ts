import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface FeedbackItem {
  rating: number;
  daysAgo: number;
  email: string;
  text: string;
}

// Comprehensive realistic scenarios across all 6 categories
const waitTimeScenarios = [
  // Negative
  { rating: 1, text: "Waited 3.5 hours in the Emergency Department with kidney stone pain before receiving any pain relief. The triage nurse repeatedly told us 'the doctor is on rounds' without any actual timeline." },
  { rating: 1, text: "Discharge took an absurd 7 hours after the consultant doctor signed the discharge papers at 10 AM. We sat in the room waiting for billing clearance until 5:30 PM." },
  { rating: 2, text: "Booked an appointment with Dr. Mehta for 11:30 AM, but was only called into the consultation room at 2:15 PM. No explanation was given for the 2.5-hour delay." },
  { rating: 2, text: "The wait time at the inpatient pharmacy counter at 8 PM was over 45 minutes with only one executive handling a queue of 25 patients." },
  { rating: 1, text: "Scheduled an outpatient MRI of the spine at 3 PM. Was made to change into a gown and wait in a freezing waiting corridor until 5:45 PM before being taken into the scanner." },
  { rating: 2, text: "The ultrasound queue in the radiology wing had pregnant mothers waiting on hard plastic chairs for nearly 3 hours past their token slots." },
  { rating: 1, text: "Phlebotomy blood collection counter had a token queue of 80 people on a Monday morning with only two technicians drawing samples. Waited 1 hour and 40 minutes fasting." },
  { rating: 2, text: "Pediatric emergency room triage was painfully slow. Several infants with high fevers were kept waiting over 90 minutes in the general waiting area." },
  { rating: 2, text: "Ambulance arrival took 45 minutes despite being located just 4 km from the hospital. The dispatch desk kept promising '5 more minutes'." },
  { rating: 1, text: "Chemotherapy daycare unit had patients with pre-scheduled 9 AM infusion slots waiting till 1 PM because the oncology pharmacy had not prepared the drug admixtures." },
  // Mixed
  { rating: 3, text: "The doctor consultation was thorough and unhurried, but having to wait 90 minutes past my scheduled slot on a weekday afternoon is very inconvenient for working professionals." },
  { rating: 3, text: "Discharge summary paperwork was prepared quickly, but the final TPA insurance settlement queue took an extra 3 hours." },
  // Positive
  { rating: 5, text: "Walked into the Urgent Care clinic with a minor burn and was seen by the attending physician within 7 minutes. Outstanding responsiveness and minimal wait time." },
  { rating: 5, text: "The new digital token system at the Outpatient Lab is phenomenal. Received an SMS 10 minutes before my turn and had my blood drawn within 15 minutes of arriving." },
  { rating: 4, text: "Expected a long wait on a Saturday morning in Cardiology OPD, but the entire consultation, ECG, and 2D echo were wrapped up in under 75 minutes." },
  { rating: 5, text: "Day-care cataract surgery admission and discharge process was like clockwork. Admitted at 7:30 AM, operated by 9:00 AM, and discharged happily by 12:30 PM." },
];

const staffBehaviorScenarios = [
  // Negative
  { rating: 1, text: "The receptionist at the 2nd-floor oncology desk was rude and dismissive when I asked where to submit my biopsy slides. She rolled her eyes and told me to read the signboards." },
  { rating: 1, text: "Night duty nurse on the 5th floor ignored my father's call bell for over 40 minutes when his IV cannula became dislodged and started leaking blood onto the bedsheets." },
  { rating: 2, text: "The security guards at the main entrance were aggressive and hostile towards my elderly mother who was having difficulty walking without wheelchair assistance." },
  { rating: 1, text: "Billing clerk shouted at my wife when she asked for clarification regarding ambiguous line items on the pharmacy bill. Extremely unprofessional behavior." },
  { rating: 2, text: "The junior resident who performed the morning rounds was completely inattentive, barely glanced at the post-op surgical drain, and dismissed my questions about fever spikes." },
  { rating: 2, text: "Dietary staff delivered cold meals and threw the food tray on the bedside table without even greeting the patient or checking if the table was reachable." },
  { rating: 1, text: "Phlebotomist was impatient, made three painful attempts to find a vein without apologizing, and was visibly frustrated when I winced." },
  { rating: 2, text: "Ward attendant demanded a tip ('baksheesh') from my family before wheeling my grandmother to the discharge car park." },
  // Mixed
  { rating: 3, text: "The primary surgeon Dr. Joshi was world-class, but the administrative front desk staff are consistently blunt and lacking basic hospitality training." },
  { rating: 3, text: "Nursing staff during day shifts are polite and proactive, but the night shift nurses seem disengaged and slow to answer patient calls." },
  // Positive
  { rating: 5, text: "Sister Mary and Sister Latha in the ICU Step-Down unit treated my mother with the utmost dignity, kindness, and gentle care. They are true angels in scrubs." },
  { rating: 5, text: "Dr. Arvind in Pediatric Pulmonology spent 30 minutes explaining asthma management to our 7-year-old in a gentle, reassuring way that removed all her fear." },
  { rating: 5, text: "The hospital patient experience coordinator visited our room daily to check on our comfort and resolved our request for an extra blanket within 10 minutes." },
  { rating: 5, text: "From the valet parking attendant to the senior consultant, every staff member we encountered greeted us warmly and guided us with genuine care." },
  { rating: 4, text: "The physiotherapy team led by Dr. Sneha was encouraging, patient, and highly motivating during my post-hip replacement rehabilitation sessions." },
];

const treatmentQualityScenarios = [
  // Negative
  { rating: 1, text: "Post-operative surgical site developed a severe bacterial infection 3 days after laparoscopic hernia repair. The discharge instructions never mentioned monitoring for redness." },
  { rating: 2, text: "Received conflicting medical advice from two different duty doctors regarding post-stroke blood thinner dosages, creating immense anxiety for our family." },
  { rating: 1, text: "Initial ultrasound report failed to detect an acute appendicitis, declaring it 'mild gastritis'. We had to rush to another facility the next morning for emergency surgery." },
  { rating: 2, text: "Patient was prescribed an antibiotic that was explicitly documented in his file as a known penicillin allergy. Thankfully the pharmacy pharmacist caught the error before administration." },
  { rating: 1, text: "Knee arthroscopy showed no improvement even after 4 months of following the prescribed rehab protocol. A second opinion revealed incomplete meniscus resection." },
  { rating: 2, text: "Dental extraction resulted in a dry socket and severe localized nerve numbness. Follow-up care was rushed and provided minimal relief." },
  { rating: 2, text: "Blood pressure medications were suddenly altered without explaining the potential dizziness side effects, leading to a fainting episode at home." },
  // Mixed
  { rating: 3, text: "The spine surgery itself was technically successful and relieved my sciatica, but the post-discharge physiotherapy follow-up guidance was vague and uncoordinated." },
  { rating: 3, text: "Doctor accurately diagnosed my pneumonia, but the prescribed intravenous antibiotics caused severe gastric upset that wasn't addressed until 48 hours later." },
  // Positive
  { rating: 5, text: "Dr. Venkatesh performed coronary stenting with exceptional precision. My angina symptoms disappeared immediately, and his post-cardiac care plan has been life-changing." },
  { rating: 5, text: "Exceptional clinical care in the Neonatal ICU. The neonatology team managed our premature baby's respiratory distress with unmatched expertise and daily updates." },
  { rating: 5, text: "Accurate diagnosis of a rare autoimmune condition after 2 years of other clinics guessing. The rheumatology department here changed my life for the better." },
  { rating: 5, text: "Underwent total laparoscopic hysterectomy with minimal post-op discomfort and was able to walk the same evening. Outstanding surgical quality." },
  { rating: 5, text: "The sports medicine and orthopedic team accurately diagnosed my rotator cuff tear and provided a non-surgical regenerative therapy that fully restored mobility." },
  { rating: 4, text: "Dermatology consultation for chronic psoriasis was very effective. The modern biologic treatment prescribed has cleared my skin within 6 weeks." },
];

const billingInsuranceScenarios = [
  // Negative
  { rating: 1, text: "Hospital billed ₹68,000 extra under 'miscellaneous disposable charges' that our insurance provider rejected. The billing department refused to explain the breakdown." },
  { rating: 1, text: "The cashless insurance TPA desk delayed pre-authorization paperwork by 24 hours, forcing us to postpone a critical elective spine surgery." },
  { rating: 2, text: "Was promised cashless coverage for dengue hospitalization, but at the time of discharge was suddenly told to pay ₹42,000 in cash and claim reimbursement manually." },
  { rating: 1, text: "Overcharged for ICU consumable packs that were never opened or used in room 412. Had to spend 3 hours arguing with the billing supervisor to get them removed." },
  { rating: 2, text: "Quoted an all-inclusive surgery package of ₹1,20,000, but final settlement invoice came out to ₹1,87,000 with zero prior communication about package exclusions." },
  { rating: 1, text: "Security deposit of ₹15,000 paid at admission has still not been refunded to our bank account after 4 weeks and multiple emails to billing accounts." },
  { rating: 2, text: "Pharmacy bills for inpatient stay were significantly higher than standard retail MRP on identical cardiovascular medications." },
  // Mixed
  { rating: 3, text: "The medical care was great, but the billing department needs serious streamlining. Why does an itemized bill take 4 hours to print out?" },
  { rating: 3, text: "Insurance desk helped process our cashless claim, but failed to inform us in advance about the ₹12,000 co-payment deduction." },
  // Positive
  { rating: 5, text: "The insurance desk executive, Rajesh, handled our Star Health cashless approval seamlessly within 45 minutes of admission. Completely hassle-free experience." },
  { rating: 5, text: "Transparent billing with zero surprise costs. The estimate given during surgical counseling matched the final invoice to the exact rupee." },
  { rating: 5, text: "Assisted us with the Ayushman Bharat government scheme paperwork with great patience and empathy. Complete cashless treatment delivered without any friction." },
  { rating: 4, text: "Itemized billing was clear and transparent. All medications and lab tests were documented with clear timestamps and doctor orders." },
  { rating: 5, text: "Rapid cashless discharge approval in under 90 minutes. Compared to other private hospitals, CarePulse billing efficiency is top-notch." },
];

const facilitiesHygieneScenarios = [
  // Negative
  { rating: 1, text: "The washroom in room 204 had overflowing drainage and smelled terribly throughout our 3-day admission. Housekeeping only mopped once despite repeated requests." },
  { rating: 1, text: "Spotted a cockroach crawling near the food tray cart on the 3rd-floor maternity ward. Unacceptable hygiene standard for a tertiary care hospital." },
  { rating: 2, text: "The air conditioning in the patient room was broken during peak summer heat, blowing warm air. Maintenance took over 14 hours to bring a portable cooler." },
  { rating: 2, text: "Hospital parking lot was pure chaos. Took 45 minutes to find parking while accompanying a chemotherapy patient who could barely walk." },
  { rating: 1, text: "Bed linens were stained with old antiseptic stains and were not changed for 48 hours until we complained directly to the nursing supervisor." },
  { rating: 2, text: "Visitor cafeteria food was unhygienic; two of our family members developed severe stomach cramps after eating the buffet lunch." },
  { rating: 2, text: "The main passenger elevator was out of order, causing massive crowding and delays in wheeling patients between diagnostic floors." },
  // Mixed
  { rating: 3, text: "Hospital building and entrance lobby look like a 5-star hotel, but the shared waiting room restrooms on the OPD floor were poorly maintained." },
  { rating: 3, text: "Room cleanliness was decent, but the street noise and construction sounds from the new wing made it impossible to sleep soundly." },
  // Positive
  { rating: 5, text: "The private suite on the 6th floor was immaculate, whisper-quiet, and cleaned three times a day with hospital-grade sanitizers." },
  { rating: 5, text: "Infection control standards in the surgical ICU are truly world-class. Strict hand hygiene protocols followed by every visitor and medical staff." },
  { rating: 5, text: "The hospital campus is beautifully landscaped, wheelchair-accessible throughout, and possesses ample clean seating for waiting family members." },
  { rating: 4, text: "Healthy, diet-compliant meals prepared by clinical nutritionists were served hot and neatly packaged in eco-friendly containers." },
  { rating: 5, text: "Modern, spotless dialysis unit with dedicated television screens and ergonomic reclining chairs for patients undergoing 4-hour sessions." },
];

const digitalPortalScenarios = [
  // Negative
  { rating: 1, text: "The CarePulse mobile app failed during online payment for our teleconsultation, debited the ₹1,500 fee, but never generated the booking confirmation." },
  { rating: 1, text: "Cannot download pathology blood test reports on the patient portal. The PDF viewer shows an endless loading spinner on both iOS and Android." },
  { rating: 2, text: "Scheduled a video consult with Dr. Kapoor, but the video link inside the app kept disconnecting every 2 minutes with audio lag." },
  { rating: 1, text: "The OTP verification for logging into the patient records app never arrives on international mobile numbers, making post-op follow-up impossible for NRI patients." },
  { rating: 2, text: "Uploaded previous MRI scans to the portal as requested before the specialist appointment, but the doctor's workstation showed 'file not found'." },
  { rating: 2, text: "The medicine refill order placed through the CarePulse digital pharmacy was silently cancelled after 3 days without any SMS or notification." },
  { rating: 1, text: "The web portal interface is cluttered, confusing, and resets the appointment booking form every time you switch dates." },
  // Mixed
  { rating: 3, text: "The app is great for viewing lab results once they appear, but notifications for when new reports are ready rarely fire." },
  { rating: 3, text: "Telehealth consultation audio was clear, but the electronic prescription took 24 hours to appear in the app dashboard." },
  // Positive
  { rating: 5, text: "The CarePulse app makes booking appointments, checking lab reports, and paying bills completely effortless. Best hospital portal I have used." },
  { rating: 5, text: "Received automated WhatsApp alerts with direct PDF download links as soon as my thyroid and lipid profile test results were validated." },
  { rating: 5, text: "Teleconsultation feature is seamless. Dr. Bannerjee reviewed my ECG upload in real time and prescribed medication directly to the app within 15 minutes." },
  { rating: 4, text: "Smart check-in kiosk at the hospital lobby using QR code from the app allowed us to skip the front desk registration line entirely." },
  { rating: 5, text: "The integrated medication reminder feature in the portal helped my elderly father stay on schedule with his post-angioplasty drug regimen." },
];

// Names for generating realistic patient emails
const firstNames = [
  "Aarav", "Aditi", "Amit", "Ananya", "Anil", "Anirudh", "Aparna", "Arjun", "Bhavna", "Chetan",
  "Deepak", "Deepika", "Divya", "Gaurav", "Gayatri", "Harish", "Ishaan", "Jaya", "Karan", "Kavita",
  "Kunal", "Lakshmi", "Madhav", "Manish", "Meera", "Mohan", "Nandini", "Naveen", "Neha", "Nikhil",
  "Pooja", "Pradeep", "Prakash", "Pranav", "Prashant", "Priya", "Rahul", "Rajesh", "Rakesh", "Ramesh",
  "Rani", "Rashmi", "Ravi", "Rekha", "Rohan", "Rohit", "Sachin", "Sameer", "Sandhya", "Sanjay",
  "Santhosh", "Sarita", "Satish", "Shalini", "Shankar", "Shashi", "Shilpa", "Shiva", "Shruti", "Siddharth",
  "Sneha", "Somesh", "Sridhar", "Subhash", "Sudhir", "Sujata", "Sumit", "Sunil", "Sunita", "Suresh",
  "Swati", "Tanvi", "Tarun", "Umesh", "Vaishali", "Varun", "Vedant", "Vikas", "Vikram", "Vinay",
  "Vineet", "Vipul", "Vishal", "Vivek", "Yash", "Yogesh", "Abhishek", "Aishwarya", "Akash", "Alok"
];

const lastNames = [
  "Agarwal", "Bansal", "Bhatia", "Chakraborty", "Chauhan", "Chopra", "Das", "Deshmukh", "Dutta", "Gandhi",
  "Ghosh", "Gupta", "Iyer", "Jain", "Jha", "Joshi", "Kapoor", "Kaul", "Khan", "Khatri",
  "Kulkarni", "Kumar", "Malhotra", "Mehta", "Menon", "Mishra", "Mukherjee", "Nair", "Pandey", "Patel",
  "Patil", "Pillai", "Prasad", "Purohit", "Rao", "Reddy", "Roy", "Sarin", "Saxena", "Sen",
  "Shah", "Sharma", "Shetty", "Shukla", "Singh", "Sinha", "Soni", "Srivastava", "Talwar", "Tandon",
  "Tiwari", "Tripathi", "Vaidya", "Varma", "Verma", "Vyas", "Yadav", "Ahuja", "Bahl", "Bakshi"
];

const emailDomains = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "rediffmail.com", "proton.me", "tcs.com", "infosys.com", "wipro.com"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFeedbackDataset(targetCount = 300): FeedbackItem[] {
  const result: FeedbackItem[] = [];
  const allCategories = [
    waitTimeScenarios,
    staffBehaviorScenarios,
    treatmentQualityScenarios,
    billingInsuranceScenarios,
    facilitiesHygieneScenarios,
    digitalPortalScenarios,
  ];

  const usedCombinations = new Set<string>();

  for (let i = 0; i < targetCount; i++) {
    // Pick category in round-robin fashion for balanced distribution
    const categoryScenarios = allCategories[i % allCategories.length];
    const scenario = getRandomElement(categoryScenarios);

    // Days ago distributed across the 3-month window: 1 to 90 days ago
    // Using a spread where all 3 months are represented evenly
    const daysAgo = Math.floor(1 + ((i * 89) / targetCount) + (Math.random() * 3 - 1));
    const clampedDaysAgo = Math.max(1, Math.min(90, Math.round(daysAgo)));

    // Generate unique realistic email
    const fn = getRandomElement(firstNames).toLowerCase();
    const ln = getRandomElement(lastNames).toLowerCase();
    const domain = getRandomElement(emailDomains);
    const num = Math.floor(Math.random() * 899 + 100);
    const email = `${fn}.${ln}${num}@${domain}`;

    // Add slight natural variations to text if scenario already used
    let text = scenario.text;
    const key = `${text.slice(0, 30)}_${clampedDaysAgo}`;
    if (usedCombinations.has(key)) {
      const prefixes = [
        "Patient feedback: ",
        "Visiting note: ",
        "CarePulse experience: ",
        "Clinical review: ",
        "Recent experience: ",
      ];
      text = `${getRandomElement(prefixes)}${text}`;
    }
    usedCombinations.add(key);

    result.push({
      rating: scenario.rating,
      daysAgo: clampedDaysAgo,
      email,
      text,
    });
  }

  return result;
}

// Read existing feedbacks
const jsonPath = resolve(process.cwd(), 'input_data/healthcare_carepulse_feedbacks.json');
let existing: FeedbackItem[] = [];
try {
  existing = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch {
  existing = [];
}

console.log(`Found ${existing.length} existing feedbacks.`);

// Generate 300 new feedbacks for 3-month range
const newFeedbacks = generateFeedbackDataset(300);
console.log(`Generated ${newFeedbacks.length} new feedbacks across 90-day (3-month) window.`);

// Combine existing + new (400 total)
const combined = [...existing, ...newFeedbacks];

writeFileSync(jsonPath, JSON.stringify(combined, null, 2), 'utf8');
console.log(`✓ Successfully updated ${jsonPath} with ${combined.length} total feedbacks (${newFeedbacks.length} new records).`);
