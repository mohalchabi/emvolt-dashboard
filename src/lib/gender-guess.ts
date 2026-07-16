// Approximates a lead's gender from their first name. There is no gender
// field on Lead — this is a heuristic over common Gulf/Arabic (transliterated,
// multiple spelling variants included) and generic English first names, used
// only for an optional admin filter. Anything not in the lists below is
// "unknown" rather than guessed, so the filter never asserts a gender it
// isn't reasonably confident about.

const MALE_NAMES = new Set([
  "mohammed", "mohamed", "muhammad", "mohamad", "muhammed", "hamad",
  "ahmed", "ahmad", "abdullah", "abdulla", "abdallah",
  "khalid", "khaled", "fahad", "fahd", "faisal", "faysal",
  "saud", "sultan", "turki", "bandar", "majed", "majid", "rakan",
  "yousef", "yousuf", "youssef", "yusuf", "ibrahim", "omar", "umar",
  "ali", "hassan", "hussein", "husain", "hussain",
  "waleed", "walid", "saad", "talal", "naif", "nayef", "meshal", "mishal",
  "salman", "abdulaziz", "abdelaziz", "abdulrahman", "abdurrahman", "abdelrahman",
  "abdulkarim", "abdelkarim", "nasser", "naser", "saleh", "salah",
  "tariq", "tarek", "karim", "kareem", "samir", "sameer",
  "hamed", "hamza", "hamzah", "yazan", "ziad", "ziyad", "zaid", "zayed",
  "rashid", "rashed", "sami", "samy", "adel", "adil", "majd", "marwan",
  "nabil", "nawaf", "jaber", "jabir", "thamer", "thani", "obaid", "obeid",
  "essa", "eisa", "isa", "khalifa", "khalifah", "badr", "bader",
  "feras", "fares", "faris", "jamal", "jameel", "jamil", "wael", "wail",
  "ayman", "ehab", "ihab", "mustafa", "mostafa", "taha", "hadi", "hady",
  "murad", "moaz", "moath", "essam", "esam", "hisham", "husam", "kamal",
  "karam", "luay", "luai", "mazen", "mazin", "mohanad", "muhannad",
  "nadir", "nader", "nasr", "obada", "qusai", "qusay", "raed", "raid",
  "rami", "ramy", "rayan", "riyad", "riyadh", "saber", "sabir",
  "sherif", "shareef", "sohail", "suhail", "taher", "tahir", "tamer",
  "tareq", "wasim", "waseem", "yasser", "yaser", "zakaria", "zakariya",
  "farouk", "farouq", "samer", "jad", "elias", "elyas", "ilyas", "adam",
  "noah", "nuh", "saif", "seif", "saeed", "said", "fahim", "hatem",
  "hazem", "imad", "emad", "iyad", "jihad", "kais", "qais", "laith",
  "layth", "majdi", "malek", "malik", "murtaza", "nael", "nayel",
  "qasim", "qassim", "rafik", "rafiq", "sadeq", "sadiq", "wisam",
  "yahya", "yehya", "zain", "zayn", "zuhair", "zoheir", "khan",
  "rabih", "rabee", "mousa", "musa", "moussa", "eslam", "islam",
  "abdulmalik", "abdulillah", "sattam", "hazza", "mansour", "mansor",
  "sagr", "saqr", "hilal", "helal", "fawaz", "ghassan", "anas",
  "yazeed", "yazid", "muath", "muaz", "abdulwahab", "abdelwahab",
  "mohammad", "hussam", "hassam", "bander", "alaa", "alaaedin",
  "abdulelah", "meteab", "mitab", "aqeel", "tameem", "tamim",
  "hicham", "hatim", "abid", "mujahed", "mugahed", "azam", "azmi",
  "osama", "usama", "asim", "aasim", "aseem", "bilal", "anwar",
  "amr", "amin", "amine", "amir", "ammir", "ammar", "ashraf",
  "ehsan", "jehad", "hani", "michael", "harry", "alan", "allan",
  "arsalan", "abhijit", "aarav", "araav", "bhavesh", "fadel",
  "dhafer", "bakr",
], );

const FEMALE_NAMES = new Set([
  "sara", "sarah", "nora", "noura", "nourah", "lama", "reem", "rim",
  "layla", "laila", "leila", "hessa", "hessah", "munira", "muneera",
  "aisha", "aysha", "ayesha", "fatima", "fatma", "fatimah",
  "maha", "haya", "hayat", "alanoud", "ghada", "rana", "rania",
  "dana", "dania", "amal", "wafa", "wafaa", "nouf", "amani", "amany",
  "jawaher", "shatha", "hanan", "hind", "hinda", "huda", "jana", "jenna",
  "jumana", "jumanah", "khadija", "khadijah", "lina", "leen", "lian",
  "lujain", "lulwa", "lulwah", "maisa", "maysa", "maram", "maryam",
  "mariam", "mariyam", "mona", "muna", "nada", "nadia", "najla", "najlaa",
  "nawal", "noor", "nour", "nur", "ola", "olla", "rahaf", "raghad",
  "raneem", "ranim", "razan", "rawan", "rowan", "reema", "rima", "rula",
  "sahar", "salma", "salwa", "samar", "samia", "samya", "shaima",
  "shaimaa", "shahad", "sumaya", "sumayah", "taghreed", "tala", "taleen",
  "thuraya", "wedad", "wijdan", "yara", "yasmin", "yasmine", "yasmeen",
  "zainab", "zaynab", "zeina", "zayna", "hala", "hana", "hanadi",
  "iman", "joud", "jood", "danah", "deema", "deemah", "dima", "ghadeer",
  "ghina", "hadeel", "hadil", "kholoud", "khulood", "lamis", "lamia",
  "lamees", "malak", "marwa", "mays", "maysoon", "mila", "mirah",
  "nadin", "nadine", "nawar", "nayla", "noha", "nuha", "ramla", "rasha",
  "rehab", "rihab", "roa", "ruba", "sabreen", "sabrine", "sanaa",
  "shahd", "sondos", "sundus", "tahani", "thana", "waad", "zahra",
  "zahraa", "abeer", "abir", "amira", "ameera", "buthaina", "dalal",
  "dalia", "dina", "dunia", "fadwa", "fajar", "fajr", "farah",
  "ghofran", "ghofraan", "ghufran", "halima", "hasna", "ibtisam",
  "joana", "juhaina", "kawthar", "lateefa", "latifa", "maisoon",
  "malika", "manal", "mashael", "meshael", "nabila", "najah",
  "nasreen", "nasrin", "rand", "remas", "rimas", "safa", "safia",
  "saja", "shorouk", "souad", "suad", "tuqa", "wadha", "wadhah",
  "yumna", "zeinab", "amna", "amina", "aminah", "nermeen", "nermin",
  "rana", "rania", "raghad", "areej", "arij", "asma", "asmaa", "bushra",
  "eman", "ghina", "haifa", "hayfa", "jihan", "juhaina", "layan",
  "lian", "mai", "may", "nesreen", "nesrine", "rakan", "mounira",
], );

export type GuessedGender = "male" | "female" | "unknown";

export function guessGender(fullName: string): GuessedGender {
  const first = fullName
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!first) return "unknown";
  if (MALE_NAMES.has(first)) return "male";
  if (FEMALE_NAMES.has(first)) return "female";
  return "unknown";
}
