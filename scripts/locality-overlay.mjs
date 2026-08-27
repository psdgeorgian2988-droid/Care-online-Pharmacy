/** Extra village / sector / mohalla names attached to a PIN (delivery areas, not only post-office names). */
function sectors(label, nums) {
  return nums.map((num) => `${label} Sector ${num}`);
}

function list(...names) {
  return names.flat();
}

export const LOCALITY_OVERLAY = {
  110001: list(
    "New Delhi HO",
    "Sansad Marg",
    "Baroda House",
    "Bengali Market",
    "Bhagat Singh Market",
    "Connaught Place",
    "Constitution House",
    "Election Commission",
    "Janpath",
    "North Avenue",
    "Parliament House",
    "Patiala House",
    "Pragati Maidan",
    "Rail Bhawan",
    "Secretariat North",
    "Shastri Bhawan"
  ),
  110016: list("Green Park", "Green Park Market", "Hauz Khas", "IIT Hauz Khas", "Technology Bhawan"),
  110017: list(
    "Chirag Delhi",
    "Malviya Nagar",
    "Panchsheel Enclave",
    "Pushp Vihar",
    "Saket",
    "Sarvodaya Enclave",
    "South Malviya Nagar"
  ),
  110018: list(
    "Chand Nagar",
    "Fateh Nagar",
    "Khyala Phase I",
    "Khyala Phase II",
    "Mahabir Nagar",
    "Tilak Nagar",
    "Vikaspuri",
    "Chaukhandi"
  ),
  110022: list(sectors("R K Puram", [1, 3, 4, 5, 6, 7, 8, 12])),
  110045: list(
    "DDA Flats Nasirpur",
    "Indira Park",
    "Palam Village",
    "Dabri",
    "Nasirpur"
  ),
  110058: list("Janakpuri", "Janakpuri B-1", "Janakpuri C-4", "DESU Colony", "Jail Road"),
  110059: list("Jeevan Park", "Matiala", "Uttam Nagar", "Hastal Village"),
  110070: list("Vasant Kunj", "Masood Pur"),
  110075: list(
    sectors("Dwarka", [1, 2, 5, 6, 7, 10, 11, 13, 19]),
    "Amberhai",
    "Amberhai Village",
    "Palam Vihar",
    "District Court Complex Dwarka"
  ),
  110077: list(
    sectors("Dwarka", [8, 9, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]),
    "SPG Complex",
    "Raj Nagar I",
    "Raj Nagar II",
    "Puran Nagar",
    "Dev Kunj",
    "Palam Village Extension",
    "Bharthal",
    "Bagdola",
    "Dhulsiras"
  ),
  110078: list(
    sectors("Dwarka", [3, 4, 12, 13, 14, 15, 16, 17, 18]),
    "Bharat Vihar",
    "Suraj Vihar",
    "Nand Vihar",
    "Hari Vihar",
    "Kakrola",
    "Kakrola Village",
    "NSIT Dwarka",
    "GGSIP University"
  ),
  110085: list(
    "Prashant Vihar",
    "Rithala",
    "Avantika",
    "Rohini Courts",
    sectors("Rohini", [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 16, 17])
  ),
  110089: list(sectors("Rohini", [15, 21, 22, 23, 24, 25])),
  110091: list(
    "Himmatpuri",
    "Kalyanpuri",
    "Kalyanvas",
    "Mayur Vihar Phase I",
    "Patparganj",
    "Trilokpuri",
    "Chilla"
  ),
  110096: list("Mayur Vihar Phase III", "Vasundhara Enclave", "Ghazipur"),
};
