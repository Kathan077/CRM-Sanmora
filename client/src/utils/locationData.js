/* =============================================================
   SANMORA CRM — PRO LOCATION DATABASE & AUTO-CASCADE ENGINE
   Comprehensive Country -> State -> City -> Area -> Pincode mapping
   ============================================================= */

export const LOCATION_DATABASE = {
  "India": {
    "Gujarat": {
      "Ahmedabad": [
        { name: "SG Highway", pincode: "380054" },
        { name: "Satellite", pincode: "380015" },
        { name: "Prahlad Nagar", pincode: "380015" },
        { name: "Bodakdev", pincode: "380054" },
        { name: "Ashram Road", pincode: "380009" },
        { name: "Vastrapur", pincode: "380015" },
        { name: "CG Road", pincode: "380009" },
        { name: "Navrangpura", pincode: "380009" },
        { name: "Maninagar", pincode: "380008" },
        { name: "Bopal", pincode: "380058" },
        { name: "South Bopal", pincode: "380058" },
        { name: "Gota", pincode: "380060" },
        { name: "Thaltej", pincode: "380059" },
        { name: "Science City", pincode: "380060" },
        { name: "Paldi", pincode: "380007" },
        { name: "Ellis Bridge", pincode: "380006" },
        { name: "Naranpura", pincode: "380013" },
        { name: "Chandkheda", pincode: "382424" },
        { name: "Ranip", pincode: "382470" },
        { name: "Sarkhej", pincode: "382210" }
      ],
      "Surat": [
        { name: "Vesu", pincode: "395007" },
        { name: "Adajan", pincode: "395009" },
        { name: "Ghod Dod Road", pincode: "395007" },
        { name: "Varachha", pincode: "395006" },
        { name: "Piplod", pincode: "395007" },
        { name: "Ring Road", pincode: "395002" },
        { name: "Katargam", pincode: "395004" },
        { name: "Althan", pincode: "395017" },
        { name: "City Light", pincode: "395007" },
        { name: "Palanpur", pincode: "395009" }
      ],
      "Vadodara": [
        { name: "Alkapuri", pincode: "390007" },
        { name: "Sayajigunj", pincode: "390005" },
        { name: "Gotri", pincode: "390021" },
        { name: "Fatehgunj", pincode: "390002" },
        { name: "Akota", pincode: "390020" },
        { name: "Karelibaug", pincode: "390018" },
        { name: "Vasna Road", pincode: "390007" },
        { name: "Manjalpur", pincode: "390011" },
        { name: "Subhanpura", pincode: "390023" },
        { name: "Waghodia Road", pincode: "390019" }
      ],
      "Rajkot": [
        { name: "Kalawad Road", pincode: "360005" },
        { name: "150 Feet Ring Road", pincode: "360006" },
        { name: "Yagnik Road", pincode: "360001" },
        { name: "Raiya Road", pincode: "360007" },
        { name: "Mavdi", pincode: "360004" },
        { name: "Bhakti Nagar", pincode: "360002" }
      ],
      "Gandhinagar": [
        { name: "GIFT City", pincode: "382355" },
        { name: "Infocity", pincode: "382007" },
        { name: "Kudasan", pincode: "382421" },
        { name: "Sargasan", pincode: "382421" },
        { name: "Sector 11", pincode: "382011" },
        { name: "Sector 21", pincode: "382021" },
        { name: "Vavol", pincode: "382016" }
      ],
      "Bhavnagar": [{ name: "Kalanala", pincode: "364001" }, { name: "Waghawadi Road", pincode: "364002" }],
      "Jamnagar": [{ name: "Park Colony", pincode: "361008" }, { name: "Bedeshwar", pincode: "361002" }],
      "Anand": [{ name: "V V Nagar", pincode: "388120" }, { name: "GIDC", pincode: "388121" }],
      "Vapi": [{ name: "GIDC Industrial Area", pincode: "396195" }, { name: "Chala", pincode: "396191" }],
      "Bharuch": [{ name: "Zadeswar", pincode: "392011" }, { name: "GNFC Township", pincode: "392015" }]
    },
    "Maharashtra": {
      "Mumbai": [
        { name: "Bandra West", pincode: "400050" },
        { name: "Andheri West", pincode: "400053" },
        { name: "Andheri East", pincode: "400069" },
        { name: "Nariman Point", pincode: "400021" },
        { name: "BKC (Bandra Kurla Complex)", pincode: "400051" },
        { name: "Lower Parel", pincode: "400013" },
        { name: "Powai", pincode: "400076" },
        { name: "Juhu", pincode: "400049" },
        { name: "Borivali West", pincode: "400092" },
        { name: "Worli", pincode: "400018" },
        { name: "Dadar West", pincode: "400028" },
        { name: "Thane West", pincode: "400601" },
        { name: "Malad West", pincode: "400064" },
        { name: "Navi Mumbai (Vashi)", pincode: "400703" }
      ],
      "Pune": [
        { name: "Hinjawadi Phase 1", pincode: "411057" },
        { name: "Baner", pincode: "411045" },
        { name: "Kothrud", pincode: "411038" },
        { name: "Viman Nagar", pincode: "411014" },
        { name: "Wakad", pincode: "411057" },
        { name: "Koregaon Park", pincode: "411001" },
        { name: "Hadapsar", pincode: "411028" },
        { name: "Shivaji Nagar", pincode: "411005" },
        { name: "Kharadi", pincode: "411014" },
        { name: "Aundh", pincode: "411007" }
      ],
      "Nagpur": [{ name: "Dharampeth", pincode: "440010" }, { name: "Civil Lines", pincode: "440001" }],
      "Nashik": [{ name: "College Road", pincode: "422005" }, { name: "Indira Nagar", pincode: "422009" }],
      "Thane": [{ name: "Ghodbunder Road", pincode: "400615" }, { name: "Majiwada", pincode: "400601" }]
    },
    "Delhi NCR": {
      "New Delhi": [
        { name: "Connaught Place", pincode: "110001" },
        { name: "South Extension", pincode: "110049" },
        { name: "Hauz Khas", pincode: "110016" },
        { name: "Saket", pincode: "110017" },
        { name: "Dwarka Sector 10", pincode: "110075" },
        { name: "Janakpuri", pincode: "110058" },
        { name: "Karol Bagh", pincode: "110005" },
        { name: "Okhla Industrial Area", pincode: "110020" },
        { name: "Vasant Kunj", pincode: "110070" },
        { name: "Nehru Place", pincode: "110019" }
      ],
      "Gurgaon": [
        { name: "Cyber City", pincode: "122002" },
        { name: "Golf Course Road", pincode: "122002" },
        { name: "DLF Phase 1", pincode: "122002" },
        { name: "DLF Phase 3", pincode: "122002" },
        { name: "Sector 44", pincode: "122003" },
        { name: "Sector 54", pincode: "122011" },
        { name: "Sohna Road", pincode: "122018" },
        { name: "MG Road", pincode: "122001" }
      ],
      "Noida": [
        { name: "Sector 62", pincode: "201309" },
        { name: "Sector 18", pincode: "201301" },
        { name: "Sector 15", pincode: "201301" },
        { name: "Sector 63", pincode: "201307" },
        { name: "Greater Noida West", pincode: "201306" }
      ],
      "Faridabad": [{ name: "Sector 15", pincode: "121007" }, { name: "NIT Faridabad", pincode: "121001" }]
    },
    "Karnataka": {
      "Bengaluru": [
        { name: "Koramangala", pincode: "560034" },
        { name: "Indiranagar", pincode: "560038" },
        { name: "Whitefield", pincode: "560066" },
        { name: "Electronic City Phase 1", pincode: "560100" },
        { name: "HSR Layout", pincode: "560102" },
        { name: "MG Road", pincode: "560001" },
        { name: "Jayanagar", pincode: "560041" },
        { name: "Marathahalli", pincode: "560037" },
        { name: "Hebbal", pincode: "560024" },
        { name: "Yelahanka", pincode: "560064" }
      ],
      "Mysuru": [{ name: "Gokulam", pincode: "570002" }, { name: "Vijayanagar", pincode: "570017" }],
      "Mangaluru": [{ name: "Kodialbail", pincode: "575003" }, { name: "Kadri", pincode: "575002" }]
    },
    "Rajasthan": {
      "Jaipur": [
        { name: "Malviya Nagar", pincode: "302017" },
        { name: "C-Scheme", pincode: "302001" },
        { name: "Vaishali Nagar", pincode: "302021" },
        { name: "Mansarovar", pincode: "302020" },
        { name: "Raja Park", pincode: "302004" },
        { name: "Jagatpura", pincode: "302017" }
      ],
      "Udaipur": [{ name: "Fatehpura", pincode: "313001" }, { name: "Hiran Magri", pincode: "313002" }],
      "Jodhpur": [{ name: "Sardarpura", pincode: "342003" }, { name: "Ratanada", pincode: "342011" }]
    },
    "Tamil Nadu": {
      "Chennai": [
        { name: "T Nagar", pincode: "600017" },
        { name: "Anna Nagar", pincode: "600040" },
        { name: "OMR (IT Expressway)", pincode: "600096" },
        { name: "Velachery", pincode: "600042" },
        { name: "Adyar", pincode: "600020" },
        { name: "Guindy", pincode: "600032" }
      ],
      "Coimbatore": [{ name: "RS Puram", pincode: "641002" }, { name: "Peelamedu", pincode: "641004" }]
    },
    "Telangana": {
      "Hyderabad": [
        { name: "HITECH City", pincode: "500081" },
        { name: "Gachibowli", pincode: "500032" },
        { name: "Banjara Hills", pincode: "500034" },
        { name: "Jubilee Hills", pincode: "500033" },
        { name: "Madhapur", pincode: "500081" },
        { name: "Kondapur", pincode: "500084" }
      ]
    },
    "Uttar Pradesh": {
      "Lucknow": [
        { name: "Hazratganj", pincode: "226001" },
        { name: "Gomti Nagar", pincode: "226010" },
        { name: "Aliganj", pincode: "226024" }
      ],
      "Kanpur": [{ name: "Civil Lines", pincode: "208001" }, { name: "Swaroop Nagar", pincode: "208002" }],
      "Agra": [{ name: "Sanjay Place", pincode: "282002" }],
      "Varanasi": [{ name: "Lanka", pincode: "221005" }]
    },
    "West Bengal": {
      "Kolkata": [
        { name: "Salt Lake Sector V", pincode: "700091" },
        { name: "Park Street", pincode: "700016" },
        { name: "New Town Rajarhat", pincode: "700156" }
      ]
    },
    "Punjab": {
      "Chandigarh": [
        { name: "Sector 17", pincode: "160017" },
        { name: "Sector 35", pincode: "160035" },
        { name: "Industrial Area Phase 1", pincode: "160002" }
      ],
      "Ludhiana": [{ name: "Sarabha Nagar", pincode: "141001" }, { name: "Model Town", pincode: "141002" }],
      "Amritsar": [{ name: "Ranjit Avenue", pincode: "143001" }]
    },
    "Andhra Pradesh": { "Visakhapatnam": [{ name: "Beach Road", pincode: "530002" }], "Vijayawada": [{ name: "MG Road", pincode: "520010" }] },
    "Arunachal Pradesh": { "Itanagar": [{ name: "Ganga Market", pincode: "791111" }] },
    "Assam": { "Guwahati": [{ name: "GS Road", pincode: "781005" }] },
    "Bihar": { "Patna": [{ name: "Boring Road", pincode: "800001" }] },
    "Chhattisgarh": { "Raipur": [{ name: "Pandri", pincode: "492004" }] },
    "Goa": { "Panaji": [{ name: "Fontainhas", pincode: "403001" }], "Margao": [{ name: "Fatorda", pincode: "403602" }] },
    "Haryana": { "Gurgaon": [{ name: "Cyber City", pincode: "122002" }], "Faridabad": [{ name: "Sector 15", pincode: "121007" }] },
    "Himachal Pradesh": { "Shimla": [{ name: "Mall Road", pincode: "171001" }], "Dharamshala": [{ name: "McLeod Ganj", pincode: "176219" }] },
    "Jharkhand": { "Ranchi": [{ name: "Main Road", pincode: "834001" }], "Jamshedpur": [{ name: "Bistupur", pincode: "831001" }] },
    "Kerala": { "Kochi": [{ name: "MG Road", pincode: "682016" }], "Thiruvananthapuram": [{ name: "Kowdiar", pincode: "695003" }] },
    "Madhya Pradesh": { "Indore": [{ name: "Vijay Nagar", pincode: "452010" }], "Bhopal": [{ name: "MP Nagar", pincode: "462011" }] },
    "Manipur": { "Imphal": [{ name: "Thangal Bazar", pincode: "795001" }] },
    "Meghalaya": { "Shillong": [{ name: "Police Bazar", pincode: "793001" }] },
    "Mizoram": { "Aizawl": [{ name: "Zarkawt", pincode: "796001" }] },
    "Nagaland": { "Kohima": [{ name: "PR Hill", pincode: "797001" }] },
    "Odisha": { "Bhubaneswar": [{ name: "Saheed Nagar", pincode: "751007" }], "Cuttack": [{ name: "Cantonment", pincode: "753001" }] },
    "Sikkim": { "Gangtok": [{ name: "MG Marg", pincode: "737101" }] },
    "Tripura": { "Agartala": [{ name: "Abhoynagar", pincode: "799005" }] },
    "Uttarakhand": { "Dehradun": [{ name: "Rajpur Road", pincode: "248001" }], "Haridwar": [{ name: "Kankhal", pincode: "249408" }] },
    "Andaman & Nicobar Islands": { "Port Blair": [{ name: "Aberdeen Bazar", pincode: "744101" }] },
    "Chandigarh": { "Chandigarh": [{ name: "Sector 17", pincode: "160017" }] },
    "Dadra & Nagar Haveli and Daman & Diu": { "Daman": [{ name: "Nani Daman", pincode: "396210" }] },
    "Jammu & Kashmir": { "Srinagar": [{ name: "Lal Chowk", pincode: "190001" }], "Jammu": [{ name: "Gandhi Nagar", pincode: "180004" }] },
    "Ladakh": { "Leh": [{ name: "Main Bazar", pincode: "194101" }] },
    "Lakshadweep": { "Kavaratti": [{ name: "Kavaratti Island", pincode: "682555" }] },
    "Puducherry": { "Puducherry": [{ name: "White Town", pincode: "605001" }] }
  },
  "United States": {
    "California": {
      "Los Angeles": [
        { name: "Downtown LA", pincode: "90012" },
        { name: "Santa Monica", pincode: "90401" },
        { name: "Beverly Hills", pincode: "90210" },
        { name: "Hollywood", pincode: "90028" },
        { name: "Century City", pincode: "90067" }
      ],
      "San Francisco": [
        { name: "Financial District", pincode: "94104" },
        { name: "SoMa", pincode: "94107" },
        { name: "Union Square", pincode: "94108" },
        { name: "Mission District", pincode: "94110" }
      ],
      "San Jose": [
        { name: "Silicon Valley", pincode: "95110" },
        { name: "Downtown San Jose", pincode: "95113" },
        { name: "Santana Row", pincode: "95128" }
      ]
    },
    "Texas": {
      "Houston": [
        { name: "Downtown Houston", pincode: "77002" },
        { name: "Uptown / Galleria", pincode: "77056" },
        { name: "The Woodlands", pincode: "77380" }
      ],
      "Austin": [
        { name: "Downtown Austin", pincode: "78701" },
        { name: "Domain", pincode: "78758" },
        { name: "South Congress", pincode: "78704" }
      ],
      "Dallas": [
        { name: "Downtown Dallas", pincode: "75201" },
        { name: "Uptown Dallas", pincode: "75204" },
        { name: "Plano", pincode: "75024" }
      ]
    },
    "New York": {
      "New York City": [
        { name: "Manhattan Midtown", pincode: "10001" },
        { name: "Wall Street", pincode: "10005" },
        { name: "Soho", pincode: "10012" },
        { name: "DUMBO Brooklyn", pincode: "11201" }
      ]
    },
    "Florida": {
      "Miami": [
        { name: "Brickell", pincode: "33131" },
        { name: "Downtown Miami", pincode: "33132" },
        { name: "South Beach", pincode: "33139" }
      ]
    }
  },
  "United Arab Emirates": {
    "Dubai": {
      "Dubai City": [
        { name: "Business Bay", pincode: "00000" },
        { name: "Downtown Dubai", pincode: "00000" },
        { name: "Dubai Marina", pincode: "00000" },
        { name: "Deira", pincode: "00000" },
        { name: "Jumeirah Lake Towers (JLT)", pincode: "00000" },
        { name: "Al Barsha", pincode: "00000" },
        { name: "DIFC", pincode: "00000" }
      ]
    },
    "Abu Dhabi": {
      "Abu Dhabi City": [
        { name: "Corniche", pincode: "00000" },
        { name: "Al Reem Island", pincode: "00000" },
        { name: "Yas Island", pincode: "00000" },
        { name: "Saadiyat Island", pincode: "00000" }
      ]
    },
    "Sharjah": {
      "Sharjah City": [
        { name: "Al Majaz", pincode: "00000" },
        { name: "Al Nahda", pincode: "00000" },
        { name: "Muwaileh", pincode: "00000" }
      ]
    }
  },
  "South Africa": {
    "Gauteng": {
      "Johannesburg": [
        { name: "Sandton", pincode: "2196" },
        { name: "Rosebank", pincode: "2196" },
        { name: "Midrand", pincode: "1685" },
        { name: "Randburg", pincode: "2194" },
        { name: "Fourways", pincode: "2055" },
        { name: "Braamfontein", pincode: "2001" }
      ],
      "Pretoria": [
        { name: "Hatfield", pincode: "0083" },
        { name: "Menlyn", pincode: "0181" },
        { name: "Centurion", pincode: "0157" }
      ]
    },
    "Western Cape": {
      "Cape Town": [
        { name: "V&A Waterfront", pincode: "8001" },
        { name: "Sea Point", pincode: "8005" },
        { name: "Century City", pincode: "7441" },
        { name: "Claremont", pincode: "7708" },
        { name: "Stellenbosch", pincode: "7600" }
      ]
    },
    "KwaZulu-Natal": {
      "Durban": [
        { name: "Umhlanga", pincode: "4319" },
        { name: "Ballito", pincode: "4420" },
        { name: "Morningside", pincode: "4001" }
      ]
    }
  },
  "United Kingdom": {
    "England": {
      "London": [
        { name: "City of London", pincode: "EC1A" },
        { name: "Canary Wharf", pincode: "E14" },
        { name: "Mayfair", pincode: "W1J" },
        { name: "Westminster", pincode: "SW1A" },
        { name: "Shoreditch", pincode: "EC2A" }
      ],
      "Manchester": [{ name: "Deansgate", pincode: "M3" }, { name: "Spinningfields", pincode: "M3" }],
      "Birmingham": [{ name: "City Centre", pincode: "B1" }, { name: "Edgbaston", pincode: "B15" }]
    },
    "Scotland": {
      "Edinburgh": [{ name: "City Centre", pincode: "EH1" }, { name: "Leith", pincode: "EH6" }],
      "Glasgow": [{ name: "City Centre", pincode: "G1" }, { name: "West End", pincode: "G12" }]
    }
  },
  "Canada": {
    "Ontario": {
      "Toronto": [
        { name: "Downtown Toronto", pincode: "M5H" },
        { name: "Yorkville", pincode: "M5R" },
        { name: "North York", pincode: "M2N" },
        { name: "Mississauga", pincode: "L5B" }
      ]
    },
    "British Columbia": {
      "Vancouver": [
        { name: "Downtown Vancouver", pincode: "V6B" },
        { name: "Yaletown", pincode: "V6B" },
        { name: "Burnaby", pincode: "V5H" }
      ]
    }
  },
  "Australia": {
    "New South Wales": {
      "Sydney": [
        { name: "Sydney CBD", pincode: "2000" },
        { name: "North Sydney", pincode: "2060" },
        { name: "Parramatta", pincode: "2150" },
        { name: "Bondi Junction", pincode: "2022" }
      ]
    },
    "Victoria": {
      "Melbourne": [
        { name: "Melbourne CBD", pincode: "3000" },
        { name: "Southbank", pincode: "3006" },
        { name: "Docklands", pincode: "3008" }
      ]
    }
  },
  "Germany": {
    "Bavaria": {
      "Munich": [
        { name: "Altstadt", pincode: "80331" },
        { name: "Schwabing", pincode: "80802" },
        { name: "Bogenhausen", pincode: "81675" }
      ]
    },
    "Berlin": {
      "Berlin City": [
        { name: "Mitte", pincode: "10115" },
        { name: "Charlottenburg", pincode: "10585" },
        { name: "Kreuzberg", pincode: "10961" }
      ]
    }
  },
  "Singapore": {
    "Central Region": {
      "Singapore City": [
        { name: "Marina Bay", pincode: "018981" },
        { name: "Orchard Road", pincode: "238839" },
        { name: "Raffles Place", pincode: "048616" },
        { name: "Tanjong Pagar", pincode: "078881" },
        { name: "Jurong East", pincode: "609601" }
      ]
    }
  }
};

/* ── COMPLETE LIST OF ALL 240+ WORLD COUNTRIES ── */
export const ALL_WORLD_COUNTRIES = [
  // Primary CRM Countries
  "India",
  "United States",
  "United Arab Emirates",
  "United Kingdom",
  "South Africa",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "Saudi Arabia",
  
  // All World Countries (Alphabetical)
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua & Barbuda", "Argentina", "Armenia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia & Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo - Brazzaville", "Congo - Kinshasa", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hong Kong SAR", "Hungary",
  "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast (Cote d'Ivoire)",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Macau SAR", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts & Nevis", "Saint Lucia", "Saint Vincent & Grenadines", "Samoa", "San Marino", "Sao Tome & Principe", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad & Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

/* ── EXHAUSTIVE MASTER CITIES DATABASE FOR ALL STATES ── */
export const STATE_CITIES_MASTER = {
  "Gujarat": [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Anand", "Vapi", "Bharuch",
    "Mehsana", "Junagadh", "Navsari", "Valsad", "Porbandar", "Morbi", "Patan", "Surendranagar", "Dahod", "Nadiad",
    "Palanpur", "Veraval", "Godhra", "Botad", "Bhuj", "Gandhidham", "Anjar"
  ],
  "Maharashtra": [
    "Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Chhatrapati Sambhajinagar (Aurangabad)", "Navi Mumbai", "Solapur",
    "Kolhapur", "Amravati", "Nanded", "Sangli", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Satara"
  ],
  "Delhi NCR": [
    "New Delhi", "Gurgaon", "Noida", "Greater Noida", "Ghaziabad", "Faridabad", "South Delhi", "North Delhi", "East Delhi", "West Delhi"
  ],
  "Karnataka": [
    "Bengaluru", "Mysuru", "Hubballi", "Dharwad", "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru", "Udupi"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Sri Ganganagar", "Pali", "Chittorgarh"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Tirunelveli", "Thoothukudi", "Thanjavur", "Kanchipuram"
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Suryapet"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj", "Ghaziabad", "Noida", "Meerut", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Jhansi", "Mathura", "Ayodhya"
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Baharampur", "Kharagpur", "Haldia"
  ],
  "Punjab": [
    "Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot", "Moga"
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Katni", "Singrauli"
  ],
  "Bihar": [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar"
  ],
  "Kerala": [
    "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram"
  ],
  "Haryana": [
    "Gurgaon", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani"
  ],
  "Odisha": [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada"
  ],
  "Jharkhand": [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar", "Giridih", "Ramgarh"
  ],
  "Chhattisgarh": [
    "Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur", "Ambikapur"
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Rishikesh", "Nainital", "Kashipur"
  ],
  "Himachal Pradesh": [
    "Shimla", "Dharamshala", "Solan", "Mandi", "Kullu", "Baddi", "Hamirpur", "Bilaspur"
  ],
  "Goa": [
    "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Curchorem"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kakinada", "Kadapa", "Anantapur"
  ],
  "Assam": [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"
  ],
  "Jammu & Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua", "Sopore"
  ],
  "Ladakh": ["Leh", "Kargil"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "California": ["Los Angeles", "San Francisco", "San Jose", "San Diego", "Sacramento", "Fresno", "Irvine", "Pasadena"],
  "Texas": ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth", "El Paso", "Plano"],
  "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany"],
  "Dubai": ["Dubai City", "Deira", "Bur Dubai", "Business Bay", "Downtown Dubai", "Jumeirah"],
  "Gauteng": ["Johannesburg", "Pretoria", "Midrand", "Sandton", "Centurion", "Randburg"]
};

/* ── EXHAUSTIVE MASTER AREAS DATABASE FOR ALL CITIES ── */
export const CITY_AREAS_MASTER = {
  "Ahmedabad": [
    { name: "SG Highway", pincode: "380054" },
    { name: "Satellite", pincode: "380015" },
    { name: "Prahlad Nagar", pincode: "380015" },
    { name: "Bodakdev", pincode: "380054" },
    { name: "Ashram Road", pincode: "380009" },
    { name: "Vastrapur", pincode: "380015" },
    { name: "CG Road", pincode: "380009" },
    { name: "Navrangpura", pincode: "380009" },
    { name: "Maninagar", pincode: "380008" },
    { name: "Bopal", pincode: "380058" },
    { name: "South Bopal", pincode: "380058" },
    { name: "Gota", pincode: "380060" },
    { name: "Thaltej", pincode: "380059" },
    { name: "Science City", pincode: "380060" },
    { name: "Paldi", pincode: "380007" },
    { name: "Ellis Bridge", pincode: "380006" },
    { name: "Naranpura", pincode: "380013" },
    { name: "Chandkheda", pincode: "382424" },
    { name: "Ranip", pincode: "382470" },
    { name: "Sarkhej", pincode: "382210" },
    { name: "Nikol", pincode: "382350" },
    { name: "Naroda", pincode: "382330" },
    { name: "Odhav", pincode: "382415" },
    { name: "Isanpur", pincode: "382443" },
    { name: "Vatva GIDC", pincode: "382445" },
    { name: "Shahibaug", pincode: "380004" },
    { name: "Usmanpura", pincode: "380013" },
    { name: "Ambawadi", pincode: "380006" },
    { name: "Drive In Road", pincode: "380054" },
    { name: "Sola", pincode: "380060" },
    { name: "Ghatlodia", pincode: "380061" },
    { name: "Memnagar", pincode: "380052" },
    { name: "Vaishno Devi Circle", pincode: "382421" },
    { name: "Shilaj", pincode: "380059" },
    { name: "Shela", pincode: "380058" }
  ],
  "Surat": [
    { name: "Vesu", pincode: "395007" },
    { name: "Adajan", pincode: "395009" },
    { name: "Ghod Dod Road", pincode: "395007" },
    { name: "Varachha", pincode: "395006" },
    { name: "Piplod", pincode: "395007" },
    { name: "Ring Road", pincode: "395002" },
    { name: "Katargam", pincode: "395004" },
    { name: "Althan", pincode: "395017" },
    { name: "City Light", pincode: "395007" },
    { name: "Palanpur", pincode: "395009" },
    { name: "Bhatar", pincode: "395007" },
    { name: "Udhna", pincode: "394210" },
    { name: "Rander", pincode: "395005" },
    { name: "VIP Road", pincode: "395007" },
    { name: "Dumas Road", pincode: "395007" }
  ],
  "Vadodara": [
    { name: "Alkapuri", pincode: "390007" },
    { name: "Sayajigunj", pincode: "390005" },
    { name: "Gotri", pincode: "390021" },
    { name: "Fatehgunj", pincode: "390002" },
    { name: "Akota", pincode: "390020" },
    { name: "Karelibaug", pincode: "390018" },
    { name: "Vasna Road", pincode: "390007" },
    { name: "Manjalpur", pincode: "390011" },
    { name: "Subhanpura", pincode: "390023" },
    { name: "Waghodia Road", pincode: "390019" },
    { name: "Gorwa", pincode: "390016" },
    { name: "Sama", pincode: "390008" },
    { name: "Nizampura", pincode: "390002" }
  ],
  "Mumbai": [
    { name: "Bandra West", pincode: "400050" },
    { name: "Bandra East", pincode: "400051" },
    { name: "Andheri West", pincode: "400053" },
    { name: "Andheri East", pincode: "400069" },
    { name: "Nariman Point", pincode: "400021" },
    { name: "BKC (Bandra Kurla Complex)", pincode: "400051" },
    { name: "Lower Parel", pincode: "400013" },
    { name: "Powai", pincode: "400076" },
    { name: "Juhu", pincode: "400049" },
    { name: "Borivali West", pincode: "400092" },
    { name: "Borivali East", pincode: "400066" },
    { name: "Worli", pincode: "400018" },
    { name: "Dadar West", pincode: "400028" },
    { name: "Thane West", pincode: "400601" },
    { name: "Malad West", pincode: "400064" },
    { name: "Goregaon West", pincode: "400104" },
    { name: "Navi Mumbai (Vashi)", pincode: "400703" },
    { name: "Ghatkopar West", pincode: "400086" },
    { name: "Chembur", pincode: "400071" },
    { name: "Santacruz West", pincode: "400054" },
    { name: "Colaba", pincode: "400005" },
    { name: "Marine Drive", pincode: "400020" }
  ],
  "Pune": [
    { name: "Hinjawadi Phase 1", pincode: "411057" },
    { name: "Hinjawadi Phase 2", pincode: "411057" },
    { name: "Baner", pincode: "411045" },
    { name: "Kothrud", pincode: "411038" },
    { name: "Viman Nagar", pincode: "411014" },
    { name: "Wakad", pincode: "411057" },
    { name: "Koregaon Park", pincode: "411001" },
    { name: "Hadapsar", pincode: "411028" },
    { name: "Shivaji Nagar", pincode: "411005" },
    { name: "Kharadi", pincode: "411014" },
    { name: "Aundh", pincode: "411007" },
    { name: "Pimple Saudagar", pincode: "411027" },
    { name: "Magarpatta City", pincode: "411028" },
    { name: "Kalyani Nagar", pincode: "411006" },
    { name: "FC Road", pincode: "411004" }
  ],
  "Bengaluru": [
    { name: "Koramangala", pincode: "560034" },
    { name: "Indiranagar", pincode: "560038" },
    { name: "Whitefield", pincode: "560066" },
    { name: "Electronic City Phase 1", pincode: "560100" },
    { name: "HSR Layout", pincode: "560102" },
    { name: "MG Road", pincode: "560001" },
    { name: "Jayanagar", pincode: "560041" },
    { name: "Marathahalli", pincode: "560037" },
    { name: "Hebbal", pincode: "560024" },
    { name: "Yelahanka", pincode: "560064" },
    { name: "BTM Layout", pincode: "560076" },
    { name: "Malleshwaram", pincode: "560003" },
    { name: "Bellandur", pincode: "560103" },
    { name: "Sarjapur Road", pincode: "560035" },
    { name: "JP Nagar", pincode: "560078" }
  ],
  "Hyderabad": [
    { name: "HITECH City", pincode: "500081" },
    { name: "Gachibowli", pincode: "500032" },
    { name: "Banjara Hills", pincode: "500034" },
    { name: "Jubilee Hills", pincode: "500033" },
    { name: "Madhapur", pincode: "500081" },
    { name: "Kondapur", pincode: "500084" },
    { name: "Begumpet", pincode: "500016" },
    { name: "Kukatpally", pincode: "500072" },
    { name: "Secunderabad", pincode: "500003" },
    { name: "Financial District", pincode: "500032" }
  ],
  "New Delhi": [
    { name: "Connaught Place", pincode: "110001" },
    { name: "South Extension", pincode: "110049" },
    { name: "Hauz Khas", pincode: "110016" },
    { name: "Saket", pincode: "110017" },
    { name: "Dwarka Sector 10", pincode: "110075" },
    { name: "Janakpuri", pincode: "110058" },
    { name: "Karol Bagh", pincode: "110005" },
    { name: "Okhla Industrial Area", pincode: "110020" },
    { name: "Vasant Kunj", pincode: "110070" },
    { name: "Nehru Place", pincode: "110019" }
  ]
};

/* ── HELPER FUNCTIONS FOR CASCADING LOOKUP ── */

export function getCountries() {
  return ALL_WORLD_COUNTRIES;
}

export function getStatesByCountry(countryName) {
  if (countryName && LOCATION_DATABASE[countryName]) {
    return Object.keys(LOCATION_DATABASE[countryName]);
  }
  return ["Capital Region", "Central State / Province", "Northern Region", "Southern Region", "Eastern Region", "Western Region", "State / Province 1", "State / Province 2"];
}

export function getCitiesByState(countryName, stateName) {
  const dbCities = (countryName && stateName && LOCATION_DATABASE[countryName]?.[stateName])
    ? Object.keys(LOCATION_DATABASE[countryName][stateName])
    : [];
  const masterCities = STATE_CITIES_MASTER[stateName] || [];
  const merged = Array.from(new Set([...dbCities, ...masterCities]));
  if (merged.length > 0) return merged;

  return ["Metropolitan City", "Central City", "Commercial Hub", "District City", "Port City"];
}

export function getAreasByCity(countryName, stateName, cityName) {
  let list = [];
  if (countryName && stateName && cityName && LOCATION_DATABASE[countryName]?.[stateName]?.[cityName]) {
    list = LOCATION_DATABASE[countryName][stateName][cityName];
  } else {
    for (const cKey in LOCATION_DATABASE) {
      for (const sKey in LOCATION_DATABASE[cKey]) {
        if (LOCATION_DATABASE[cKey][sKey][cityName]) {
          list = LOCATION_DATABASE[cKey][sKey][cityName];
          break;
        }
      }
    }
  }

  const masterList = CITY_AREAS_MASTER[cityName] || [];
  
  // Combine db areas and master areas
  const combinedMap = new Map();
  list.forEach(a => {
    const name = typeof a === 'string' ? a : a.name;
    const pin = typeof a === 'object' ? a.pincode : '380001';
    combinedMap.set(name.toLowerCase(), { name, pincode: pin });
  });

  masterList.forEach(a => {
    const name = typeof a === 'string' ? a : a.name;
    const pin = typeof a === 'object' ? a.pincode : '380001';
    if (!combinedMap.has(name.toLowerCase())) {
      combinedMap.set(name.toLowerCase(), { name, pincode: pin });
    }
  });

  const finalArray = Array.from(combinedMap.values());
  if (finalArray.length > 0) return finalArray;

  return [
    { name: "Central Commercial District", pincode: "380001" },
    { name: "Main Market / Business Hub", pincode: "380009" },
    { name: "Tech Park / Industrial Zone", pincode: "380015" },
    { name: "Civil Lines / City Center", pincode: "380006" },
    { name: "Residential Zone 1", pincode: "380015" }
  ];
}

export function getPincodeForArea(countryName, stateName, cityName, areaName) {
  const areas = getAreasByCity(countryName, stateName, cityName);
  const match = areas.find(a => a.name.toLowerCase() === (areaName || '').toLowerCase());
  return match ? match.pincode : (areas[0]?.pincode || '');
}

/* ── LIVE PINCODE LOOKUP API (INDIA POST FREE API) ── */
export async function lookupPincodeAPI(pincode) {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
      const poList = data[0].PostOffice;
      const firstPo = poList[0];
      return {
        country: 'India',
        state: firstPo.State,
        city: firstPo.District || firstPo.Circle || 'Ahmedabad',
        areas: poList.map(po => po.Name),
        defaultArea: firstPo.Name,
        pincode: pincode
      };
    }
  } catch (err) {
    console.warn('Pincode API lookup error:', err);
  }
  return null;
}

