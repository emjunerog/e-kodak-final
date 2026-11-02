/**
 * Complete Philippine Cascading Location Dataset & Auto-Fill Engine
 * Covers all 17 Philippine Regions, all 82 Provinces, all 53 Cebu Cities/Municipalities,
 * major nationwide Cities/Municipalities, and comprehensive Barangays,
 * plus live PSGC API enrichment for 100% nationwide barangay coverage.
 */

export const DEFAULT_REGION = 'Region VII (Central Visayas)';
export const DEFAULT_PROVINCE = 'Cebu';
export const DEFAULT_CITY = 'City of Naga';

// All 53 Cities & Municipalities of Cebu with their Barangays
const CEBU_CITIES_AND_MUNICIPALITIES = {
  'City of Naga': [
    'Alpaco', 'Bairan', 'Balirong', 'Cabungahan', 'Cantao-an', 'Central Poblacion',
    'Cogon', 'Colon', 'East Poblacion', 'Inayagan', 'Inoburan', 'Jaguimit', 'Lanas',
    'Langtad', 'Lutac', 'Mainit', 'Mayana', 'Naalad', 'North Poblacion', 'Pangdan',
    'Patag', 'South Poblacion', 'Tagjagimit', 'Tangke', 'Tinaan', 'Tuyan', 'Uling',
    'West Poblacion',
  ],
  Minglanilla: [
    'Cadulawan', 'Calajo-an', 'Camp 7', 'Camp 8', 'Cuanos', 'Guindaruhan', 'Linao',
    'Manduang', 'Pakigne', 'Poblacion Ward I', 'Poblacion Ward II', 'Poblacion Ward III',
    'Poblacion Ward IV', 'Tubod', 'Tulay', 'Tunghaan', 'Tungkil', 'Tungkop', 'Vito',
  ],
  'San Fernando': [
    'Balud', 'Balungag', 'Basak', 'Bugho', 'Cabatbatan', 'Greenhills', 'Ilaya',
    'Lantawan', 'Liburon', 'Magsico', 'Panadtaran', 'Pitalo', 'Poblacion North',
    'Poblacion South', 'San Isidro', 'Sangat', 'Tabionan', 'Tananas', 'Tinubdan',
    'Tonggo', 'Tubod',
  ],
  'Talisay City': [
    'Biasong', 'Bulacao', 'Cadulawan', 'Camp IV', 'Cansojong', 'Dumlog', 'Jaclupan',
    'Lagtang', 'Lawaan I', 'Lawaan II', 'Lawaan III', 'Linao', 'Maghaway', 'Manipis',
    'Mohon', 'Poblacion', 'Pooc', 'San Isidro', 'San Roque', 'Tabunoc', 'Tangke', 'Tapul',
  ],
  'Cebu City': [
    'Adlaon', 'Agsungot', 'Apas', 'Babag', 'Bacayan', 'Banilad', 'Basak Pardo',
    'Basak San Nicolas', 'Binaliw', 'Bonbon', 'Budlaan', 'Buhisan', 'Bulacao',
    'Buot-Taup', 'Busay', 'Calamba', 'Cambinocot', 'Capitol Site', 'Carreta',
    'Cogon Pardo', 'Cogon Ramos', 'Day-as', 'Duljo Fatima', 'Ermita', 'Guba',
    'Guadalupe', 'Hipodromo', 'Inayawan', 'Kalubihan', 'Kalunasan', 'Kamagayan',
    'Kamputhaw', 'Kasambagan', 'Kinasang-an Pardo', 'Labangon', 'Lahug', 'Lorega San Miguel',
    'Lusaran', 'Luz', 'Mabini', 'Mabolo', 'Malubog', 'Mambaling', 'Pahina Central',
    'Pahina San Nicolas', 'Pamutan', 'Pardo', 'Pari-an', 'Paril', 'Pasil', 'Pit-os',
    'Pulangbato', 'Pung-ol-Sibugay', 'Punta Princesa', 'Quiot Pardo', 'Sambag I',
    'Sambag II', 'San Antonio', 'San Jose', 'San Nicolas Proper', 'San Roque',
    'Santa Cruz', 'Santo Niño', 'Sapangdaku', 'Sawang Calero', 'Sinsin', 'Sirao',
    'Suba', 'Sudlon I', 'Sudlon II', 'T. Padilla', 'Tabunan', 'Tagba-o', 'Talamban',
    'Taptap', 'Tejero', 'Tinago', 'Tisa', 'To-ong', 'Zapatera',
  ],
  'Carcar City': [
    'Bolinawan', 'Buenavista', 'Calidngan', 'Can-asujan', 'Guadalupe', 'Liburon',
    'Napo', 'Ocana', 'Perrelos', 'Poblacion I', 'Poblacion II', 'Poblacion III',
    'Tuyom', 'Valencia', 'Valladolid',
  ],
  'Toledo City': [
    'Awihao', 'Bagakay', 'Bato', 'Biga', 'Bulongan', 'Bunga', 'Cabitoonan',
    'Calongcalong', 'Cambang-ug', 'Camp 8', 'Canlumampao', 'Cantabaco', 'Capitan Claudio',
    'Carmen', 'Daanglungsod', 'Don Andres Soriano (Lutopan)', 'Dumlog', 'Gen. Climaco',
    'Ibo', 'Ilihan', 'Juan Climaco Sr. (Magdugo)', 'Landahan', 'Loay', 'Luray II',
    'Matab-ang', 'Media Once', 'Pangamihan', 'Poblacion', 'Poog', 'Putingbato', 'Sagay',
    'Sam-ang', 'Sangi', 'Santo Niño (Mainggit)', 'Subayon', 'Talavera', 'Tubod', 'Tungkay',
  ],
  'Mandaue City': [
    'Alang-alang', 'Bakilid', 'Banilad', 'Basak', 'Cabancalan', 'Cambaro', 'Canduman',
    'Casili', 'Casuntingan', 'Centro (Poblacion)', 'Cubacub', 'Guizo', 'Ibabao-Estancia',
    'Jagobiao', 'Labogon', 'Looc', 'Maguikay', 'Mantuyong', 'Opao', 'Pagsabungan',
    'Pakna-an', 'Subangdaku', 'Tabok', 'Tawason', 'Tingub', 'Tipolo', 'Umapad',
  ],
  'Lapu-Lapu City': [
    'Agus', 'Babag', 'Bankal', 'Baring', 'Basak', 'Buaya', 'Calawisan', 'Canjulao',
    'Caw-oy', 'Cawhagan', 'Caubian', 'Gun-ob', 'Ibo', 'Looc', 'Mactan', 'Maribago',
    'Marigondon', 'Pajac', 'Pajo', 'Pangan-an', 'Poblacion', 'Punta Engaño', 'Pusok',
    'Sabang', 'Santa Rosa', 'Subabasbas', 'Talima', 'Tingo', 'Tungasan', 'San Vicente',
  ],
  Consolacion: [
    'Cabangahan', 'Cansaga', 'Casili', 'Danglag', 'Garing', 'Jugan', 'Lamac', 'Lanipga',
    'Nangka', 'Panas', 'Panoypoy', 'Pitogo', 'Poblacion Occidental', 'Poblacion Oriental',
    'Polog', 'Pulpogan', 'Sacsac', 'Tayud', 'Tilhaong', 'Tolotolo', 'Tugbungan',
  ],
  Liloan: [
    'Cabadiangan', 'Calero', 'Catarman', 'Cotcot', 'Jubay', 'Lataban', 'Mulao',
    'Poblacion', 'San Roque', 'San Vicente', 'Santa Cruz', 'Tabla', 'Tayud', 'Yati',
  ],
  Compostela: [
    'Bagalnga', 'Basak', 'Buluang', 'Cabadiangan', 'Cambayog', 'Canamucan', 'Cogon',
    'Dapdap', 'Estaca', 'Lupa', 'Magay', 'Mulao', 'Panangban', 'Poblacion', 'Tag-ube',
    'Tamiao', 'Tubigan',
  ],
  Cordova: [
    'Alegria', 'Bangbang', 'Buagsong', 'Catarman', 'Cogon', 'Dapitan', 'Day-as',
    'Gabi', 'Gilutongan', 'Ibabao', 'Pilipog', 'Poblacion', 'San Miguel',
  ],
  'Danao City': [
    'Baliang', 'Bayabas', 'Binaliw', 'Cabungahan', 'Cagat-Lamac', 'Cahumayan',
    'Cambanay', 'Cambubho', 'Cogon-Cruz', 'Danasan', 'Dungga', 'Dunggoan', 'Guinacot',
    'Guinsay', 'Ibo', 'Langosig', 'Lawaan', 'Licos', 'Looc', 'Magtagobtob', 'Malapoc',
    'Manlayag', 'Mantija', 'Masaba', 'Maslog', 'Nangka', 'Oguis', 'Pili', 'Poblacion',
    'Quisol', 'Sabang', 'Sacsac', 'Sandayong Norte', 'Sandayong Sur', 'Santa Rosa',
    'Santican', 'Sibacan', 'Suba', 'Taboc', 'Taytay', 'Togonon', 'Tuburan Sur',
  ],
  'Bogo City': [
    'Anonang Norte', 'Anonang Sur', 'Banban', 'Binabag', 'Bungtod (Poblacion)',
    'Carbon (Poblacion)', 'Cayang', 'Cogon (Poblacion)', 'Dakit', 'Don Pedro Rodriguez',
    'Gairan', 'Guadalupe', 'La Paz', 'La Purisima Concepcion (Poblacion)', 'Libertad',
    'Lourdes (Poblacion)', 'Malingin', 'Marangog', 'Nailon', 'Odlot', 'Pandan',
    'Polambato', 'Sambag (Poblacion)', 'San Vicente (Poblacion)', 'Santo Niño',
    'Santo Rosario (Poblacion)', 'Siocon', 'Sudlonon', 'Taytayan',
  ],
  Pinamungajan: [
    'Anislag', 'Anopog', 'Binabag', 'Buhingtubig', 'Busay', 'Butong', 'Cabiangon',
    'Camugao', 'Duangan', 'Guimbawian', 'Lamac', 'Lut-od', 'Mangoto', 'Opao',
    'Pandacan', 'Poblacion', 'Punod', 'Rizal', 'Sacsac', 'Sambagon', 'Sibago',
    'Tajao', 'Tangub', 'Tanibag', 'Tupas', 'Tutay',
  ],
  Aloguinsan: [
    'Angilan', 'Bojo', 'Bonbon', 'Esperanza', 'Kandingan', 'Kantabogon', 'Kawasan',
    'Olango', 'Poblacion', 'Punay', 'Rosario', 'Saksak', 'Tampa-an', 'Toyokon', 'Zaragosa',
  ],
  Argao: [
    'Alambijud', 'Anajao', 'Apo', 'Balaas', 'Balisong', 'Binlod', 'Bogo', 'Butong',
    'Bug-ot', 'Bulasa', 'Calagasan', 'Canbantug', 'Canbanua', 'Cansuje', 'Capio-an',
    'Casay', 'Catang', 'Colawin', 'Conalum', 'Guiwanon', 'Gutlang', 'Jampang',
    'Jomgao', 'Lamacan', 'Langtad', 'Langub', 'Lapay', 'Lengigon', 'Linut-od',
    'Mabasa', 'Mandilikit', 'Mompeller', 'Panadtaran', 'Poblacion', 'Sua', 'Sumaguan',
    'Tabayag', 'Talaga', 'Talaytay', 'Talo-ot', 'Tiguib', 'Tulang', 'Tulic', 'Ubaub', 'Usmad',
  ],
  Sibonga: [
    'Abugon', 'Bae', 'Bagacay', 'Bahay', 'Banlot', 'Basak', 'Bato', 'Cagay',
    'Can-aga', 'Candaguit', 'Cantolaroy', 'Dugoan', 'Guimbangco-an', 'Lamacan',
    'Libo', 'Lindogon', 'Magcagong', 'Manatad', 'Mangyan', 'Papan', 'Poblacion',
    'Sabang', 'Sayao', 'Simala', 'Tubod',
  ],
  Dalaguete: [
    'Ablayan', 'Babayongan', 'Balud', 'Banhigan', 'Bulak', 'Caliongan', 'Caleriohan',
    'Casay', 'Catolohan', 'Cawayan', 'Consolacion', 'Coro', 'Dugyan', 'obong',
    'Jolomaynon', 'Lanao', 'Langkas', 'Lumbang', 'Malones', 'Maloray', 'Mananggal',
    'Manlapay', 'Mantalongon', 'Nalhub', 'Obo', 'Obong', 'Panas', 'Poblacion',
    'Sacsac', 'Salug', 'Tabon', 'Tapun', 'Tuba',
  ],
  Barili: [
    'Azucena', 'Bagakay', 'Balao', 'Bolocboloc', 'Budbud', 'Bugtong Kawayan', 'Cabcaban',
    'Campangga', 'Dakit', 'Giloctog', 'Guibuangan', 'Giwanon', 'Gunting', 'Hilasgasan',
    'Japitan', 'Cagay', 'Kalubihan', 'Kangdampas', 'Candugay', 'Luhod', 'Lupo', 'Luyo',
    'Maghanoy', 'Maigang', 'Malolos', 'Mantalongon', 'Mantayupan', 'Mayana', 'Minolos',
    'Nabunturan', 'Nasipit', 'Pancil', 'Pangpang', 'Paril', 'Patupat', 'Poblacion',
    'San Rafael', 'Santa Ana', 'Sayaw', 'Tal-ot', 'Tubod', 'Vito',
  ],
  Dumanjug: [
    'Balaygtiki', 'Bitoon', 'Bulak', 'Bullogan', 'Calaboon', 'Camboang', 'Candabong',
    'Cogon', 'Cotcoton', 'Doldol', 'Ilaya (Poblacion)', 'Kabalaasnan', 'Kabatbatan',
    'Kambanog', 'Kang-actol', 'Kanghalo', 'Kanghumaod', 'Kanguha', 'Kantangkas',
    'Kanyuko', 'Kolabtingon', 'Kambolobong', 'Lawaan', 'Liong', 'Manlapay', 'Masa',
    'Matalao', 'Paculob', 'Panlaan', 'Pawa', 'Poblacion Central', 'Poblacion Looc',
    'Poblacion Sima', 'Tangil', 'Tapon', 'Tubod-Bitoon', 'Tubod-Dugoan',
  ],
  Moalboal: [
    'Agbalanga', 'Bala', 'Balabagon', 'Basdiot', 'Batadbatad', 'Bugho', 'Buguil',
    'Busay', 'Lanao', 'Poblacion East', 'Poblacion West', 'Saavedra', 'Tomonoy',
    'Tuble', 'Tunga',
  ],
  Badian: [
    'Alawijao', 'Balhaan', 'Banhigan', 'Basak', 'Basiao', 'Bato', 'Bugas', 'Calangcang',
    'Candiis', 'Dagatan', 'Dobdob', 'Ginablan', 'Lambug', 'Malabago', 'Malhiao',
    'Manduyong', 'Matutinao', 'Patong', 'Poblacion', 'Sanlagan', 'Santicon', 'Sohoton',
    'Sulsugan', 'Talayong', 'Taytay', 'Tigbao', 'Tiguib', 'Tubod', 'Zaragosa',
  ],
  Oslob: [
    'Alo', 'Bangcogon', 'Bonbon', 'Calumpang', 'Canangca-an', 'Cansalo-ay', 'Can-ukban',
    'Cañang', 'Daanlungsod', 'Gawi', 'Hagdan', 'Lagunde', 'Looc', 'Luka', 'Mainit',
    'Manlum', 'Nueva Caceres', 'Poblacion', 'Pungtod', 'Tan-awan', 'Tumalog',
  ],
  Balamban: [
    'Abucayan', 'Aliwanay', 'Arpili', 'Baliwagan (Poblacion)', 'Bayong', 'Biasong',
    'Buanoy', 'Cabagdalan', 'Cabasiangan', 'Cambuhawe', 'Cansomoroy', 'Cantibas',
    'Cantuod', 'Duangan', 'Gaas', 'Ginatilan', 'Hingatmonan', 'Lamesa', 'Liki',
    'Luca', 'Matun-og', 'Nangka', 'Pondol', 'Prenza', 'Santa Cruz-Santo Niño (Poblacion)',
    'Singsing', 'Sunog', 'Vito',
  ],
  Asturias: [
    'Agbanga', 'Agtugop', 'Bago', 'Bairan', 'Banban', 'Baye', 'Bog-o', 'Kaluangan',
    'Lanao', 'Langub', 'Looc Norte', 'Lunas', 'Magcalape', 'Manguiao', 'New Bago',
    'Owak', 'Poblacion', 'Saksak', 'San Isidro', 'San Roque', 'Santa Lucia',
    'Santa Rita', 'Tag-amakan', 'Tagbubonga', 'Tubigagmanok', 'Tubod', 'Ubogon',
  ],
  Tuburan: [
    'Alegria', 'Amatugan', 'Antipolo', 'Apalan', 'Bagasawe', 'Bakyawan', 'Bangkito',
    'Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Barangay III (Poblacion)',
    'Barangay IV (Poblacion)', 'Barangay V (Poblacion)', 'Barangay VI (Poblacion)',
    'Barangay VII (Poblacion)', 'Barangay VIII (Poblacion)', 'Bulwang', 'Caridad',
    'Carmelo', 'Cogon', 'Colonia', 'Daan Lungsod', 'Fortaliza', 'Ga-ang', 'Gimama-a',
    'Jagbuaya', 'Kabangkalan', 'Kalangahan', 'Kamansi', 'Kan-an', 'Kanlunsing',
    'Kansi', 'Kampoot', 'Libo', 'Lusong', 'Macupa', 'Mag-alwa', 'Mag-antoy',
    'Mag-atubang', 'Maghan-ay', 'Mangga', 'Marmol', 'Molobolo', 'Montealegre',
    'Putat', 'San Juan', 'Sandayong', 'Santo Niño', 'Siotes', 'Sumon', 'Tominjao', 'Tomugpa',
  ],
  Carmen: [
    'Baring', 'Cantipay', 'Cantumog', 'Cantukong', 'Caurasan', 'Corte', 'Dawis Norte',
    'Dawis Sur', 'Cogon East', 'Cogon West', 'Hagnaya', 'Ipil', 'Lanipga', 'Liboron',
    'Lower Natimao-an', 'Luyang', 'Poblacion', 'Puente', 'Sac-on', 'Triumfo', 'Upper Natimao-an',
  ],
  Catmon: [
    'Agsuwao', 'Amancion', 'Anapog', 'Bactas', 'Bongyas', 'Basak', 'Binongkalan',
    'Cabungaan', 'Cambangkaya', 'Can-ibuang', 'Catmondaan', 'Duyan', 'Ginabucan',
    'Macaas', 'Panalipan', 'Poblacion', 'San Jose (Catadman)', 'Tabili', 'Tinabyonan', ' Flores',
  ],
  Sogod: [
    'Ampongol', 'Bagakay', 'Bagatayam', 'Bawo', 'Cabalawan', 'Cabangahan', 'Calumboyan',
    'Dakit', 'Damolog', 'Ibabao', 'Liki', 'Lubo', 'Mohon', 'Nahus-an', 'Pansoy',
    'Poblacion', 'Tabunok', 'Takay',
  ],
  Bantayan: [
    'Atop-atop', 'Baigad', 'Bantigue (Poblacion)', 'Baod', 'Binaobao (Poblacion)',
    'Botigues', 'Doong', 'Guiwanon', 'Hilotongan', 'Kabac', 'Kabangbang', 'Kampingganon',
    'Kangkaibe', 'Lipayran', 'Luyongbaybay', 'Mojon', 'Obo-ob', 'Patao', 'Putian',
    'Sillon', 'Sungko', 'Suba (Poblacion)', 'Sulangan', 'Tamiao', 'Ticad (Poblacion)',
  ],
  'Santa Fe': [
    'Balidbid', 'Hagdan', 'Hilantagaan', 'Kinatarcan', 'Langub', 'Maricaban', 'Okoy',
    'Poblacion', 'Pooc', 'Talisay',
  ],
  Madridejos: [
    'Bunakan', 'Kangwayan', 'Kaongkod', 'Kodia', 'Maalat', 'Malbago', 'Mancilang',
    'Pili', 'Poblacion', 'San Agustin', 'Tabagak', 'Talangnan', 'Tarong', 'Tugas',
  ],
  Daanbantayan: [
    'Agujo', 'Bagay', 'Bakhawan', 'Bateria', 'Bitoon', 'Calape', 'Carnaza', 'Dalingding',
    'Lanao', 'Logon', 'Malbago', 'Malingin', 'Maya', 'Pajo', 'Paypay', 'Poblacion',
    'Talisay', 'Tapilon', 'Tinubdan', 'Tominjao',
  ],
  Medellin: [
    'Antipolo', 'Curva', 'Daanlungsod', 'Dalingding Sur', 'Dayhagon', 'Gibitngil',
    'Canhabagat', 'Caputatan Norte', 'Caputatan Sur', 'Kawit', 'Lamintak Norte',
    'Lamintak Sur', 'Luy-a', 'Maharuhay', 'Mahawak', 'Panugnawan', 'Poblacion',
    'Tindog', 'Don Virgilio Gonzales',
  ],
  'San Remigio': [
    'Anapog', 'Argawanon', 'Bagtic', 'Bancasan', 'Batad', 'Busogon', 'Calambua',
    'Canagahan', 'Dapdap', 'Gawaygaway', 'Hagnaya', 'Kayam', 'Kinawahan', 'Lambusan',
    'Lawis', 'Libaong', 'Looc', 'Luyang', 'Mano', 'Poblacion', 'Punta', 'Sab-a',
    'San Miguel', 'Tacup', 'Tambongon', 'To-ong', 'Victoria',
  ],
  Alcantara: ['Cabadiangan', 'Cabil-isan', 'Candabong', 'Lawaan', 'Manga', 'Palanas', 'Poblacion', 'Polo', 'Salagmaya'],
  Alcoy: ['Atabay', 'Daan-Lungsod', 'Guiwang', 'Nug-as', 'Pasol', 'Poblacion', 'Pugalo', 'San Agustin'],
  Alegria: ['Compostela', 'Guadalupe', 'Legaspi', 'Lepanto', 'Madridejos', 'Montpeller', 'Poblacion', 'Santa Filomena', 'Valencia'],
  Boljoon: ['Baclayan', 'El Pardo', 'Granada', 'Lower Becerril', 'Nangka', 'Poblacion', 'San Antonio', 'South Granada', 'Tesorero', 'Upper Becerril', 'Arbor'],
  Borbon: ['Bagacay', 'Bili', 'Bingay', 'Bongdo', 'Bongdo Gua', 'Bongoyan', 'Cadaruhan', 'Cajel', 'Campusong', 'Clavera', 'Don Gregorio Antigua', 'Laaw', 'Lugo', 'Managase', 'Poblacion', 'Sagay', 'San Jose', 'Tabunan', 'Tagnucan'],
  Ginatilan: ['Anao', 'Cagsing', 'Calabawan', 'Cambagte', 'Campisong', 'Canorong', 'Guiwanon', 'Looc', 'Malatbo', 'Mangaco', 'Palanas', 'Poblacion', 'Salamanca', 'San Roque'],
  Malabuyoc: ['Armeña', 'Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Cerdeña', 'Labrador', 'Lombo', 'Mahanlud', 'Mindanao', 'Montañeza', 'Salmeron', 'Santo Niño', 'Sorsogon', 'Tolosa', 'Looc'],
  Pilar: ['Biasong', 'Cawit', 'Dapdap', 'Esperanza', 'Lanao', 'Lower Poblacion', 'Moabog', 'Montserrat', 'San Isidro', 'San Juan', 'Upper Poblacion', 'Villahermosa', 'Imelda'],
  Poro: ['Adela', 'Altavista', 'Cagcagan', 'Cansabusab', 'Daan Paz', 'Eastern Poblacion', 'Esperanza', 'Libertad', 'Mabini', 'Mercedes', 'Pagsa', 'Paz', 'Rizal', 'San Jose', 'Santa Rita', 'Teguis', 'Western Poblacion'],
  Ronda: ['Butong', 'Can-abuhon', 'Canduling', 'Cansalonoy', 'Cansayahon', 'Ilaya', 'Langin', 'Libo-o', 'Malalay', 'Palanas', 'Poblacion', 'Santa Cruz', 'Tupas', 'Vive'],
  Samboan: ['Basak', 'Bonbon', 'Bulangsuran', 'Calatagan', 'Cambigong', 'Canorong', 'Colase', 'Dalahikan', 'Jumangpas', 'Kamburoy', 'Poblacion', 'San Sebastian', 'Suba', 'Tangbo', 'Monteverde'],
  'San Francisco': ['Montealegre', 'Cabunga-an', 'Campo', 'Consuelo', 'Esperanza', 'Himensulan', 'Northern Poblacion', 'San Isidro', 'Santa Cruz', 'Santiago', 'Sonog', 'Southern Poblacion', 'Unidos', 'Union', 'Western Poblacion'],
  Santander: ['Bunlan', 'Cabutongan', 'Candamiang', 'Canlumacad', 'Liloan', 'Lip-tong', 'Looc', 'Pasil', 'Poblacion', 'Talisay'],
  Tabogon: ['Alang-alang', 'Caduawan', 'Camoboan', 'Canaocanao', 'Combado', 'Daantabogon', 'Ilihan', 'Kal-anan', 'Labangon', 'Libjo', 'Loong', 'Mabuli', 'Managase', 'Manlagtang', 'Maslog', 'Muabog', 'Pio', 'Poblacion', 'Salag', 'Sambag', 'San Isidro', 'San Vicente', 'Somosa', 'Taba-ao', 'Tapul'],
  Tabuelan: ['Bongon', 'Dalid', 'Kanlim-ao', 'Kanluhangon', 'Kantubaon', 'Mabunao', 'Maravilla', 'Olivo', 'Poblacion', 'Tabunok', 'Tigbawan', 'Villahermosa'],
  Tudela: ['Buenavista', 'Calmante', 'Daan Secante', 'General', 'McArthur', 'Northern Poblacion', 'Puertobello', 'Santander', 'Secante Bag-o', 'Southern Poblacion', 'Villahermosa'],
};

const STANDARD_BARANGAYS = [
  'Poblacion', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion East',
  'Poblacion West', 'Poblacion North', 'Poblacion South', 'Bagong Silang', 'Barangay 1',
  'Barangay 2', 'Barangay 3', 'Buenavista', 'Cogon', 'Libertad', 'Mabini', 'Rizal',
  'San Antonio', 'San Isidro', 'San Jose', 'San Juan', 'San Miguel', 'San Nicolas',
  'San Pedro', 'San Roque', 'San Vicente', 'Santa Cruz', 'Santa Maria', 'Santo Niño',
];

function createCityMap(cities) {
  const map = {};
  cities.forEach((city) => {
    map[city] = STANDARD_BARANGAYS;
  });
  return map;
}

export const PHILIPPINE_LOCATIONS = {
  'Region VII (Central Visayas)': {
    Cebu: CEBU_CITIES_AND_MUNICIPALITIES,
    Bohol: {
      'Tagbilaran City': ['Bool', 'Booy', 'Cabawan', 'Cogon', 'Dampas', 'Dao', 'Manga', 'Mansasa', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'San Isidro', 'Taloto', 'Tiptip', 'Ubujan'],
      Panglao: ['Bil-isan', 'Bolod', 'Danao', 'Doljo', 'Libaong', 'Looc', 'Lourdes', 'Poblacion', 'Tangnan', 'Tawala'],
      Dauis: ['Biking', 'Bingag', 'Catarman', 'Dao', 'Mayacabac', 'Poblacion', 'Songculan', 'Tabalong', 'Tinago', 'Totolan'],
      Tubigon: ['Bagongbanwa', 'Bunacan', 'Cabulijan', 'Centro (Poblacion)', 'Guiwanon', 'Macaas', 'Pinayagan Norte', 'Pooc Occidental', 'Pooc Oriental'],
      Talibon: ['Bagacay', 'Balintawak', 'Burgos', 'Poblacion', 'San Agustin', 'San Francisco', 'San Isidro', 'San Jose', 'San Pedro', 'San Roque'],
      Ubay: ['Bood', 'Camambugan', 'Fatima', 'Imelda', 'Lomangog', 'Poblacion', 'San Pascual', 'Tapon', 'Tintinan'],
      Jagna: ['Bunga Ilaya', 'Bunga Mar', 'Can-uba', 'Can-upao', 'Looc', 'Pagina', 'Poblacion (Pondol)', 'Tejero', 'Tubod Mar'],
      Carmen: ['Alegria', 'Bicao', 'Buenavista', 'Buenos Aires', 'Katipunan', 'Montesuerte', 'Poblacion Norte', 'Poblacion Sur'],
      Inabanga: ['Bahan', 'Badiang', 'Cogon', 'Ilaud (Poblacion)', 'Luyo', 'Nabuad', 'Ondol', 'Tungod'],
      Loon: ['Basac', 'Cogon Norte', 'Lintuan', 'Moto Norte (Poblacion)', 'Moto Sur (Poblacion)', 'Napnot', 'Pig-ot', 'Song-on'],
    },
    'Negros Oriental': {
      'Dumaguete City': ['Bagacay', 'Bajumpandan', 'Balugo', 'Banilad', 'Bantayan', 'Batinguel', 'Buñao', 'Cadawinonan', 'Calindagan', 'Camanjac', 'Candau-ay', 'Cantil-e', 'Daro', 'Junob', 'Looc', 'Mangnao-Canal', 'Motong', 'Piapi', 'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4', 'Poblacion 5', 'Poblacion 6', 'Poblacion 7', 'Poblacion 8', 'Pulantubig', 'Tabuctubig', 'Taclobo', 'Talay'],
      'Bais City': ['Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Cabanlutan', 'Cambagahan', 'Capiñahan', 'Lo-oc', 'Okiot', 'Olympia', 'Talungon', 'Tamisu'],
      'Bayawan City': ['Ali-is', 'Banaybanay', 'Banga', 'Boyco', 'Bugay', 'Cansumalig', 'Dawis', 'Nangka', 'Poblacion', 'Suba', 'Tinago', 'Ubos', 'Villareal'],
      'Canlaon City': ['Bayog', 'Binalbagan', 'Bucalan', 'Linothangan', 'Lumapao', 'Mabigo', 'Malaiba', 'Masulog', 'Panubigan', 'Pula'],
      'Guihulngan City': ['Bakid', 'Balogo', 'Banwague', 'Basak', 'Binobohan', 'Buenavista', 'Bulado', 'Hilaitan', 'McKinley', 'Poblacion'],
      'Tanjay City': ['Azagra', 'Bahi-an', 'Luca', 'Manipis', 'Novallas', 'Obogon', 'Pal-ew', 'Poblacion I', 'Poblacion II', 'San Isidro', 'San Jose', 'Santa Cruz Nuevo'],
      Sibulan: ['Agan-an', 'Ajong', 'Balugo', 'Bolocboloc', 'Calabogo', 'Cangmating', 'Enrique Villanueva', 'Looc', 'Magatas', 'Maningcao', 'Maslog', 'Poblacion', 'San Antonio', 'Tubtubon'],
      Valencia: ['Apolong', 'Balabag', 'Balayagmanok', 'Balili', 'Balugo', 'Bong-ao', 'Bongbong', 'Calayugan', 'Cambucad', 'Jawa', 'Liptong', 'Malaunay', 'North Poblacion', 'Palinpinon', 'South Poblacion'],
    },
    Siquijor: {
      Siquijor: ['Banban', 'Bolos', 'Caipilan', 'Candanay Norte', 'Candanay Sur', 'Canal', 'Cang-alwang', 'Dumanhog', 'Poblacion', 'Pulangyuta', 'San Antonio', 'Songculan', 'Tinago'],
      Larena: ['Balolang', 'Basac', 'Bintangan', 'Cabulihan', 'Calunasan', 'Candigum', 'Cang-allas', 'Cangbagsa', 'Helen', 'Nonoc', 'North Poblacion', 'Ponong', 'Sabang', 'Sandugan', 'South Poblacion', 'Taculing'],
      Lazi: ['Campalanas', 'Cangclaran', 'Cangomantong', 'Capalasanan', 'Catamboan', 'Gabayan', 'Kimba', 'Kinamandagan', 'Lower Cabangcalan', 'Nagerong', 'Po-o', 'Simacolong', 'Tagmanocan', 'Talayong', 'Tigbawan', 'Tignao', 'Upper Cabangcalan', 'Ytaya'],
      Maria: ['Bogo', 'Bonga', 'Cabal-asan', 'Calunasan', 'Candaping A', 'Candaping B', 'Cantaroc A', 'Cantaroc B', 'Cantugbas', 'Lico-an', 'Lilo-an', 'Looc', 'Logucan', 'Minalulan', 'Nabutay', 'Olang', 'Pisong A', 'Pisong B', 'Poblacion Norte', 'Poblacion Sur', 'Saguing', 'Sawang'],
      'San Juan': ['Canasagan', 'Candura', 'Cangmunag', 'Cansayang', 'Catulayan', 'Lala-o', 'Maite', 'Napo', 'Paliton', 'Poblacion', 'Solangon', 'Tag-ibo', 'Tambisan', 'Timbaon', 'Tubod'],
      'Enrique Villanueva': ['Balolong', 'Bino-ongan', 'Bitaug', 'Bolot', 'Camogao', 'Cangmangki', 'Libo', 'Lomangcapan', 'Lotloton', 'Manan-ao', 'Olave', 'Parian', 'Poblacion', 'Tulapos'],
    },
  },
  'NCR (National Capital Region)': {
    'Metro Manila': {
      'Quezon City': ['Alicia', 'Bagong Pag-asa', 'Bagumbayan', 'Bahay Toro', 'Balingasa', 'Batasan Hills', 'Commonwealth', 'Culiat', 'Diliman', 'Fairview', 'Holy Spirit', 'Kamuning', 'Katipunan', 'Krung Na Ligas', 'Loyola Heights', 'Matandang Balara', 'New Era', 'Novaliches Proper', 'Payatas', 'Project 4', 'Project 6', 'Project 8', 'Sacred Heart', 'San Bartolome', 'Santo Domingo', 'Sikatuna Village', 'South Triangle', 'Tandang Sora', 'Teachers Village', 'UP Campus', 'Valencia', 'White Plains'],
      'Manila City': ['Binondo', 'Ermita', 'Intramuros', 'Malate', 'Paco', 'Pandacan', 'Port Area', 'Quiapo', 'Sampaloc', 'San Andres', 'San Miguel', 'San Nicolas', 'Santa Ana', 'Santa Cruz', 'Santa Mesa', 'Tondo'],
      'Makati City': ['Bangkal', 'Bel-Air', 'Carmona', 'Dasmariñas', 'Forbes Park', 'Guadalupe Nuevo', 'Guadalupe Viejo', 'Kasilawan', 'La Paz', 'Legazpi Village', 'Magallanes', 'Olympia', 'Palanan', 'Pio del Pilar', 'Poblacion', 'Rockwell', 'Salcedo Village', 'San Antonio', 'San Isidro', 'San Lorenzo', 'Santa Cruz', 'Singkamas', 'Tejeros', 'Urdaneta', 'Valenzuela'],
      'Taguig City': ['Bagumbayan', 'Bambang', 'Calzada', 'Central Bicutan', 'Central Signal Village', 'Fort Bonifacio (BGC)', 'Hagonoy', 'Ibayo-Tipas', 'Katuparan', 'Ligid-Tipas', 'Lower Bicutan', 'Maharlika Village', 'Napindan', 'New Lower Bicutan', 'North Daang Hari', 'North Signal Village', 'Palingon', 'Pinagsama', 'San Miguel', 'Santa Ana', 'South Daang Hari', 'South Signal Village', 'Tanyag', 'Tuktukan', 'Upper Bicutan', 'Ususan', 'Wawa', 'Western Bicutan'],
      'Pasig City': ['Bagong Ilog', 'Bagong Katipunan', 'Bambang', 'Buting', 'Caniogan', 'Dela Paz', 'Kalawaan', 'Kapasigan', 'Kapitolyo', 'Malinao', 'Manggahan', 'Maybunga', 'Oranbo', 'Palatiw', 'Pinagbuhatan', 'Pineda', 'Rosario', 'Sagad', 'San Antonio', 'San Joaquin', 'San Jose', 'San Miguel', 'San Nicolas', 'Santa Cruz', 'Santa Lucia', 'Santa Rosa', 'Santo Tomas', 'Santolan', 'Sumilang', 'Ugong'],
      'Parañaque City': ['Baclaran', 'BF Homes', 'Don Bosco', 'Don Galo', 'La Huerta', 'Marcelo Green', 'Merville', 'Moonwalk', 'San Antonio', 'San Dionisio', 'San Isidro', 'San Martin de Porres', 'Santo Niño', 'Sun Valley', 'Tambo', 'Vitalez'],
      'Pasay City': ['Baclaran', 'Malibay', 'Maricaban', 'Newport City', 'Pasay Rotonda', 'San Isidro', 'San Jose', 'San Rafael', 'San Roque', 'Santa Clara', 'Santo Niño', 'Villamor'],
      'Mandaluyong City': ['Addition Hills', 'Bagong Silang', 'Barangka Drive', 'Barangka Ibaba', 'Barangka Ilaya', 'Barangka Itaas', 'Buayang Bato', 'Burol', 'Daang Bakal', 'Hagdang Bato Itaas', 'Hagdang Bato Libis', 'Harapin Ang Bukas', 'Highway Hills', 'Hulo', 'Mabini-J. Rizal', 'Malamig', 'Mauway', 'Namayan', 'New Zañiga', 'Old Zañiga', 'Pag-asa', 'Plainview', 'Pleasant Hills', 'Poblacion', 'San Jose', 'Vergara', 'Wack-Wack Greenhills'],
      'Marikina City': ['Barangka', 'Calumpang', 'Concepcion Uno', 'Concepcion Dos', 'Fortune', 'Industrial Valley', 'Jesus de la Peña', 'Malanday', 'Marikina Heights', 'Nangka', 'Parang', 'San Roque', 'Santa Elena', 'Santo Niño', 'Tañong', 'Tumana'],
      'Muntinlupa City': ['Alabang', 'Ayala Alabang', 'Bayanan', 'Buli', 'Cupang', 'Poblacion', 'Putatan', 'Sucat', 'Tunasan'],
      'Las Piñas City': ['Almanza Uno', 'Almanza Dos', 'BF International', 'Daniel Fajardo', 'Elias Aldana', 'Ilaya', 'Manuyo Uno', 'Manuyo Dos', 'Pamplona Uno', 'Pamplona Dos', 'Pamplona Tres', 'Pilar', 'Pulang Lupa Uno', 'Pulang Lupa Dos', 'Talon Uno', 'Talon Dos', 'Talon Tres', 'Talon Kuatro', 'Talon Singko', 'Zapote'],
      'Caloocan City': ['Bagong Barrio', 'Bagong Silang', 'Bagumbong', 'Camarin', 'Grace Park East', 'Grace Park West', 'Kaybiga', 'Llano', 'Maypajo', 'Monumento', 'Sangandaan', 'Santa Quiteria', 'Talipapa', 'Tala'],
      'Valenzuela City': ['Arkong Bato', 'Bagbaguin', 'Balangkas', 'Bignay', 'Bisig', 'Canumay East', 'Canumay West', 'Coloong', 'Dalandanan', 'Gen. T. de Leon', 'Isla', 'Karuhatan', 'Lawang Bato', 'Lingunan', 'Mabolo', 'Malanday', 'Malinta', 'Mapulang Lupa', 'Marulas', 'Maysan', 'Palasan', 'Parada', 'Pariancillo Villa', 'Paso de Blas', 'Pasolo', 'Poblacion', 'Polo', 'Punturin', 'Rincon', 'Tagalag', 'Ugong', 'Viente Reales', 'Wawang Pulo'],
      'Malabon City': ['Acacia', 'Baritan', 'Bayan-bayanan', 'Catmon', 'Concepcion', 'Dampalit', 'Flores', 'Hulong Duhat', 'Ibaba', 'Longos', 'Maysilo', 'Muzon', 'Niugan', 'Panghulo', 'Potrero', 'San Agustin', 'Santulan', 'Tañong', 'Tinajeros', 'Tonsuya', 'Tugatog'],
      'Navotas City': ['Bagumbayan North', 'Bagumbayan South', 'Bangculasi', 'Daanghari', 'Navotas East', 'Navotas West', 'NBBS Dagat-dagatan', 'NBBS Kaunlaran', 'NBBS Proper', 'North Bay Boulevard North', 'San Jose (Poblacion)', 'San Rafael Village', 'San Roque', 'Sipac-Almacen', 'Tangos North', 'Tangos South', 'Tanza 1', 'Tanza 2'],
      'San Juan City': ['Addition Hills', 'Balong-Bato', 'Batis', 'Corazon de Jesus', 'Ermitaño', 'Greenhills', 'Isabelita', 'Kabayanan', 'Little Baguio', 'Maytunas', 'Onse', 'Pasadeña', 'Pedro Cruz', 'Progreso', 'Rivera', 'Salapan', 'San Perfecto', 'Santa Lucia', 'Tibagan', 'West Crame'],
      Pateros: ['Aguho', 'Magtanggol', 'Martires del 96', 'Poblacion', 'San Pedro', 'San Roque', 'Santa Ana', 'Santo Rosario-Kanluran', 'Santo Rosario-Silangan', 'Tabacalera'],
    },
  },
  'CAR (Cordillera Administrative Region)': {
    Abra: createCityMap(['Bangued', 'Bucay', 'Dolores', 'La Paz', 'Lagangilang', 'Manabo', 'Pidigan', 'Pilar', 'Tayum', 'Villaviciosa']),
    Apayao: createCityMap(['Calanasan', 'Conner', 'Flora', 'Kabugao', 'Luna', 'Pudtol', 'Santa Marcela']),
    Benguet: {
      'Baguio City': ['Abanao-Zandueta', 'Aurora Hill', 'Bakakeng Central', 'Bakakeng North', 'Burnham-Legarda', 'Camp 7', 'Camp 8', 'Cabinet Hill-Teacher’s Camp', 'City Camp Central', 'Dominican Hill-Mirador', 'Engineers Hill', 'Gibraltar', 'Greenwater Village', 'Guisad Central', 'Irisan', 'Kias', 'Loakan Proper', 'Mines View Park', 'Outlook Drive', 'Pacdal', 'Pinsao Proper', 'Quezon Hill', 'Saint Joseph Village', 'Scout Barrio', 'Session Road Area', 'South Drive'],
      'La Trinidad': ['Alapang', 'Alno', 'Ambiong', 'Bahong', 'Balili', 'Beckel', 'Bineng', 'Betag', 'Cruz', 'Lubas', 'Pico', 'Poblacion', 'Puguis', 'Shilan', 'Tawang', 'Wangal'],
      ...createCityMap(['Atok', 'Bakun', 'Bokod', 'Buguias', 'Itogon', 'Kabayan', 'Kapangan', 'Kibungan', 'Mankayan', 'Sablan', 'Tuba', 'Tublay']),
    },
    Ifugao: createCityMap(['Aguinaldo', 'Alfonso Lista', 'Asipulo', 'Banaue', 'Hingyon', 'Hungduan', 'Kiangan', 'Lagawe', 'Lamut', 'Mayoyao', 'Tinoc']),
    Kalinga: createCityMap(['Tabuk City', 'Balbalan', 'Lubuagan', 'Pasil', 'Pinukpuk', 'Rizal', 'Tanudan', 'Tinglayan']),
    'Mountain Province': createCityMap(['Bontoc', 'Barlig', 'Bauko', 'Besao', 'Natonin', 'Paracelis', 'Sabangan', 'Sadanga', 'Sagada', 'Tadian']),
  },
  'Region I (Ilocos Region)': {
    'Ilocos Norte': createCityMap(['Laoag City', 'Batac City', 'Bacarra', 'Badoc', 'Bangui', 'Banna', 'Burgos', 'Currimao', 'Dingras', 'Pagudpud', 'Paoay', 'Pasuquin', 'Piddig', 'Pinili', 'San Nicolas', 'Sarrat', 'Solsona', 'Vintar']),
    'Ilocos Sur': createCityMap(['Vigan City', 'Candon City', 'Bantay', 'Cabugao', 'Caoayan', 'Cervantes', 'Magsingal', 'Narvacan', 'Santa', 'Santa Catalina', 'Santa Cruz', 'Santa Lucia', 'Santa Maria', 'Santiago', 'Santo Domingo', 'Sinait', 'Tagudin']),
    'La Union': createCityMap(['San Fernando City', 'agoo', 'Aringay', 'Bacnotan', 'Balaoan', 'Bangar', 'Bauang', 'Burgos', 'Caba', 'Luna', 'Naguilian', 'Pugo', 'Rosario', 'San Gabriel', 'San Juan', 'Santo Tomas', 'Sudipen', 'Tubao']),
    Pangasinan: createCityMap(['Dagupan City', 'Alaminos City', 'San Carlos City', 'Urdaneta City', 'Agno', 'Aguilar', 'Alcala', 'Anda', 'Asingan', 'Balungao', 'Bani', 'Basista', 'Bautista', 'Bayambang', 'Binalonan', 'Binmaley', 'Bolinao', 'Bugallon', 'Burgos', 'Calasiao', 'Dasol', 'Infanta', 'Labrador', 'Laoac', 'Lingayen', 'Mabini', 'Malasiqui', 'Manaoag', 'Mangaldan', 'Mangatarem', 'Mapandan', 'Natividad', 'Pozorrubio', 'Rosales', 'San Fabian', 'San Jacinto', 'San Manuel', 'San Nicolas', 'San Quintin', 'Santa Barbara', 'Santa Maria', 'Santo Tomas', 'Sison', 'Sual', 'Tayug', 'Umingan', 'Urbiztondo', 'Villasis']),
  },
  'Region II (Cagayan Valley)': {
    Batanes: createCityMap(['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan']),
    Cagayan: createCityMap(['Tuguegarao City', 'Abulug', 'Alcala', 'Allacapan', 'Amulung', 'Aparri', 'Baggao', 'Ballesteros', 'Buguey', 'Camalaniugan', 'Claveria', 'Enrile', 'Gattaran', 'Gonzaga', 'Iguig', 'Lal-lo', 'Lasam', 'Pamplona', 'Peñablanca', 'Piat', 'Rizal', 'Sanchez-Mira', 'Santa Ana', 'Santa Praxedes', 'Santa Teresita', 'Santo Niño', 'Solana', 'Tuao']),
    Isabela: createCityMap(['Ilagan City', 'Cauayan City', 'Santiago City', 'Alicia', 'Angadanan', 'Aurora', 'Benito Soliven', 'Burgos', 'Cabagan', 'Cabatuan', 'Cordon', 'Delfin Albano', 'Dinapigue', 'Divilacan', 'Echague', 'Gamu', 'Jones', 'Luna', 'Maconacon', 'Mallig', 'Naguilian', 'Palanan', 'Quezon', 'Quirino', 'Ramon', 'Reina Mercedes', 'Roxas', 'San Agustin', 'San Guillermo', 'San Isidro', 'San Manuel', 'San Mariano', 'San Mateo', 'San Pablo', 'Santa Maria', 'Santo Tomas', 'Tumauini']),
    'Nueva Vizcaya': createCityMap(['Bayombong', 'Solano', 'Alfonso Castañeda', 'Ambaguio', 'Aritao', 'Bagabag', 'Bambang', 'Diadi', 'Dupax del Norte', 'Dupax del Sur', 'Kasibu', 'Kayapa', 'Quezon', 'Santa Fe', 'Villaverde']),
    Quirino: createCityMap(['Cabarroguis', 'Aglipay', 'Diffun', 'Maddela', 'Nagtipunan', 'Saguday']),
  },
  'Region III (Central Luzon)': {
    Aurora: createCityMap(['Baler', 'Casiguran', 'Dilasag', 'Dinalungan', 'Dingalan', 'Dipaculao', 'Maria Aurora', 'San Luis']),
    Bataan: createCityMap(['Balanga City', 'Abucay', 'Bagac', 'Dinalupihan', 'Hermosa', 'Limay', 'Mariveles', 'Morong', 'Orani', 'Orion', 'Pilar', 'Samal']),
    Bulacan: createCityMap(['Malolos City', 'Meycauayan City', 'San Jose del Monte City', 'Baliwag City', 'Angat', 'Balagtas', 'Bocaue', 'Bulakan', 'Bustos', 'Calumpit', 'Doña Remedios Trinidad', 'Guiguinto', 'Hagonoy', 'Marilao', 'Norzagaray', 'Obando', 'Pandi', 'Paombong', 'Plaridel', 'Pulilan', 'San Ildefonso', 'San Miguel', 'San Rafael', 'Santa Maria']),
    'Nueva Ecija': createCityMap(['Cabanatuan City', 'Gapan City', 'Muñoz Science City', 'Palayan City', 'San Jose City', 'Aliaga', 'Bongabon', 'Cabiao', 'Carranglan', 'Cuyapo', 'Gabaldon', 'General Mamerto Natividad', 'General Tinio', 'Guimba', 'Jaen', 'Laur', 'Licab', 'Llanera', 'Lupao', 'Nampicuan', 'Pantabangan', 'Peñaranda', 'Quezon', 'Rizal', 'San Antonio', 'San Isidro', 'San Leonardo', 'Santa Rosa', 'Santo Domingo', 'Talavera', 'Talugtug', 'Zaragoza']),
    Pampanga: createCityMap(['San Fernando City', 'Angeles City', 'Mabalacat City', 'Apalit', 'Arayat', 'Bacolor', 'Candaba', 'Floridablanca', 'Guagua', 'Lubao', 'Macabebe', 'Magalang', 'Masantol', 'Mexico', 'Minalin', 'Porac', 'San Luis', 'San Simon', 'Santa Ana', 'Santa Rita', 'Santo Tomas', 'Sasmuan']),
    Tarlac: createCityMap(['Tarlac City', 'Anao', 'Bamban', 'Camiling', 'Capas', 'Concepcion', 'Gerona', 'La Paz', 'Mayantoc', 'Moncada', 'Paniqui', 'Pura', 'Ramos', 'San Clemente', 'San Jose', 'San Manuel', 'Santa Ignacia', 'Victoria']),
    Zambales: createCityMap(['Olongapo City', 'Iba', 'Botolan', 'Cabangan', 'Candelaria', 'Castillejos', 'Masinloc', 'Palauig', 'San Antonio', 'San Felipe', 'San Marcelino', 'San Narciso', 'Santa Cruz', 'Subic']),
  },
  'Region IV-A (CALABARZON)': {
    Batangas: createCityMap(['Batangas City', 'Calaca City', 'Lipa City', 'Santo Tomas City', 'Tanauan City', 'Agoncillo', 'Alitagtag', 'Balayan', 'Balete', 'Bauan', 'Calatagan', 'Cuenca', 'Ibaan', 'Laurel', 'Lemery', 'Lian', 'Lobo', 'Mabini', 'Malvar', 'Mataasnakahoy', 'Nasugbu', 'Padre Garcia', 'Rosario', 'San Jose', 'San Juan', 'San Luis', 'San Nicolas', 'San Pascual', 'Santa Teresita', 'Taal', 'Talisay', 'Taysan', 'Tingloy', 'Tuy']),
    Cavite: {
      'Bacoor City': ['Alima', 'Aniban', 'Habay', 'Mambog', 'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Molino VI', 'Molino VII', 'Niog', 'Panapaan', 'Queens Row', 'Real', 'Salinas', 'San Nicolas', 'Talaba', 'Zapote'],
      'Dasmariñas City': ['Burol', 'Datu Esmael', 'Emmanuel Bergado', 'Fatima', 'Langkaan', 'Luzviminda', 'Paliparan', 'Sabang', 'Salawag', 'Salitran', 'Sampaloc', 'San Agustin', 'San Andres', 'San Antonio de Padua', 'San Dionisio', 'San Esteban', 'San Francisco', 'San Isidro Labrador', 'San Jose', 'San Juan', 'San Lorenzo Ruiz', 'San Luis', 'San Manuel', 'San Mateo', 'San Miguel', 'San Nicolas', 'San Roque', 'San Simon', 'Santa Cristina', 'Santa Cruz', 'Santa Fe', 'Santa Lucia', 'Santa Maria', 'Santo Cristo', 'Santo Niño', 'Victoria Reyes', 'Zone I (Poblacion)', 'Zone II', 'Zone III', 'Zone IV'],
      'Imus City': ['Alapan', 'Anabu I', 'Anabu II', 'Bayan Luma', 'Bucandala', 'Carsadang Bago', 'Magdalo', 'Maharlika', 'Malagasang', 'Medicion', 'Pag-asa', 'Palico', 'Pasong Buaya', 'Pinagbuklod', 'Poblacion', 'Tanzang Luma', 'Toclong'],
      'Tagaytay City': ['Asisan', 'Bagong Tubig', 'Calabuso', 'Dapdap East', 'Dapdap West', 'Francisco', 'Guinhawa North', 'Guinhawa South', 'Iruhin East', 'Iruhin South', 'Iruhin West', 'Kaybagal Central', 'Kaybagal North', 'Kaybagal South', 'Mag-Asawang Ilat', 'Maharlika East', 'Maharlika West', 'Maitim 2nd Central', 'Maitim 2nd East', 'Maitim 2nd West', 'Mendez Crossing East', 'Mendez Crossing West', 'Neogan', 'Patutong Malaki North', 'Patutong Malaki South', 'Sambong', 'San Jose', 'Silang Junction North', 'Silang Junction South', 'Sungay North', 'Sungay South', 'Tolentino East', 'Tolentino West', 'Zambal'],
      ...createCityMap(['Cavite City', 'Carmona City', 'General Trias City', 'Trece Martires City', 'Alfonso', 'Amadeo', 'General Emilio Aguinaldo', 'General Mariano Alvarez', 'Indang', 'Kawit', 'Magallanes', 'Maragondon', 'Mendez', 'Naic', 'Noveleta', 'Rosario', 'Silang', 'Tanza', 'Ternate']),
    },
    Laguna: {
      'Calamba City': ['Bagong Kalsada', 'Bañadero', 'Banlic', 'Barandal', 'Barangay 1 (Poblacion)', 'Batino', 'Bubuyan', 'Bucal', 'Bunggo', 'Burol', 'Camaligan', 'Canlubang', 'Halang', 'Hornalan', 'Kay-Anlog', 'La Mesa', 'Laguerta', 'Lawa', 'Lecheria', 'Lingga', 'Looc', 'Mabato', 'Majada Labas', 'Makiling', 'Mapagong', 'Masili', 'Maunong', 'Mayapa', 'Milagrosa', 'Paciano Rizal', 'Palingon', 'Palo-Alto', 'Pansol', 'Parian', 'Prinza', 'Punta', 'Puting Lupa', 'Real', 'Saimsim', 'Sampiruhan', 'San Cristobal', 'San Jose', 'San Juan', 'Sirang Lupa', 'Sucol', 'Turbina', 'Ulango', 'Uwisan'],
      'Santa Rosa City': ['Aplaya', 'Balibago', 'Caingin', 'Dila', 'Dita', 'Don Jose', 'Ibaba', 'Kanluran (Poblacion)', 'Labas', 'Macabling', 'Malitlit', 'Malusak (Poblacion)', 'Market Area (Poblacion)', 'Pooc', 'Pulong Santa Cruz', 'Santo Domingo', 'Sinalhan', 'Tagapo'],
      ...createCityMap(['Biñan City', 'Cabuyao City', 'San Pablo City', 'San Pedro City', 'Alaminos', 'Bay', 'Calauan', 'Cavinti', 'Famy', 'Kalayaan', 'Liliw', 'Los Baños', 'Luisiana', 'Lumban', 'Mabitac', 'Magdalena', 'Majayjay', 'Nagcarlan', 'Paete', 'Pagsanjan', 'Pakil', 'Pangil', 'Pila', 'Rizal', 'Santa Cruz', 'Santa Maria', 'Siniloan', 'Victoria']),
    },
    Quezon: createCityMap(['Lucena City', 'Tayabas City', 'Agdangan', 'Alabat', 'Atimonan', 'Buenavista', 'Burdeos', 'Calauag', 'Candelaria', 'Catanauan', 'Dolores', 'General Luna', 'General Nakar', 'Guinayangan', 'Gumaca', 'Infanta', 'Jomalig', 'Lopez', 'Lucban', 'Macalelon', 'Mauban', 'Mulanay', 'Padre Burgos', 'Pagbilao', 'Panukulan', 'Patnanungan', 'Perez', 'Pitogo', 'Plaridel', 'Polillo', 'Quezon', 'Real', 'Sampaloc', 'San Andres', 'San Antonio', 'San Francisco', 'San Narciso', 'Sariaya', 'Tagkawayan', 'Tiaong', 'Unisan']),
    Rizal: createCityMap(['Antipolo City', 'Angono', 'Baras', 'Binangonan', 'Cainta', 'Cardona', 'Jalajala', 'Morong', 'Pililla', 'Rodriguez (Montalban)', 'San Mateo', 'Tanay', 'Taytay', 'Teresa']),
  },
  'MIMAROPA Region (Region IV-B)': {
    Marinduque: createCityMap(['Boac', 'Buenavista', 'Gasan', 'Mogpog', 'Santa Cruz', 'Torrijos']),
    'Occidental Mindoro': createCityMap(['Mamburao', 'Abra de Ilog', 'Calintaan', 'Looc', 'Lubang', 'Magsaysay', 'Paluan', 'Rizal', 'Sablayan', 'San Jose', 'Santa Cruz']),
    'Oriental Mindoro': createCityMap(['Calapan City', 'Baco', 'Bansud', 'Bongabong', 'Bulalacao', 'Gloria', 'Mansalay', 'Naujan', 'Pinamalayan', 'Pola', 'Puerto Galera', 'Roxas', 'San Teodoro', 'Socorro', 'Victoria']),
    Palawan: createCityMap(['Puerto Princesa City', 'Aborlan', 'Agutaya', 'Araceli', 'Balabac', 'Bataraza', 'Brooke’s Point', 'Busuanga', 'Cagayancillo', 'Coron', 'Culion', 'Cuyo', 'Dumaran', 'El Nido', 'Kalayaan', 'Linapacan', 'Magsaysay', 'Narra', 'Quezon', 'Rizal', 'Roxas', 'San Vicente', 'Sofronio Española', 'Taytay']),
    Romblon: createCityMap(['Romblon', 'Alcantara', 'Banton', 'Cajidiocan', 'Calatrava', 'Concepcion', 'Corcuera', 'Ferrol', 'Looc', 'Magdiwang', 'Odiongan', 'San Agustin', 'San Andres', 'San Fernando', 'San Jose', 'Santa Fe', 'Santa Maria']),
  },
  'Region V (Bicol Region)': {
    Albay: createCityMap(['Legazpi City', 'Ligao City', 'Tabaco City', 'Bacacay', 'Camalig', 'Daraga', 'Guinobatan', 'Jovellar', 'Libon', 'Malilipot', 'Malinao', 'Manito', 'Oas', 'Pio Duran', 'Polangui', 'Rapu-Rapu', 'Santo Domingo', 'Tiwi']),
    'Camarines Norte': createCityMap(['Daet', 'Basud', 'Capalonga', 'Jose Panganiban', 'Labo', 'Mercedes', 'Paracale', 'San Lorenzo Ruiz', 'San Vicente', 'Santa Elena', 'Talisay', 'Vinzons']),
    'Camarines Sur': createCityMap(['Naga City', 'Iriga City', 'Baao', 'Balatan', 'Bato', 'Bombon', 'Buhi', 'Bula', 'Cabusao', 'Calabanga', 'Camaligan', 'Canaman', 'Caramoan', 'Del Gallego', 'Gainza', 'Garchitorena', 'Goa', 'Lagonoy', 'Libmanan', 'Lupi', 'Magarao', 'Milaor', 'Minalabac', 'Nabua', 'Ocampo', 'Pamplona', 'Pasacao', 'Pili', 'Presentacion', 'Ragay', 'Sagñay', 'San Fernando', 'San Jose', 'Sipocot', 'Siruma', 'Tigaon', 'Tinambac']),
    Catanduanes: createCityMap(['Virac', 'Bagamanoc', 'Baras', 'Bato', 'Caramoran', 'Gigmoto', 'Pandan', 'Panganiban', 'San Andres', 'San Miguel', 'Viga']),
    Masbate: createCityMap(['Masbate City', 'Aroroy', 'Baleno', 'Balud', 'Batuan', 'Cataingan', 'Cawayan', 'Claveria', 'Dimasalang', 'Esperanza', 'Mandaon', 'Milagros', 'Mobo', 'Monreal', 'Palanas', 'Pio V. Corpuz', 'Placer', 'San Fernando', 'San Jacinto', 'San Pascual', 'Uson']),
    Sorsogon: createCityMap(['Sorsogon City', 'Barcelona', 'Bulan', 'Bulusan', 'Casiguran', 'Castilla', 'Donsol', 'Gubat', 'Irosin', 'Juban', 'Magallanes', 'Matnog', 'Pilar', 'Prieto Diaz', 'Santa Magdalena']),
  },
  'Region VI (Western Visayas)': {
    Aklan: createCityMap(['Kalibo', 'Altavas', 'Balete', 'Banga', 'Batan', 'Buruanga', 'Ibajay', 'Lezo', 'Libacao', 'Madalag', 'Makato', 'Malay (Boracay)', 'Malinao', 'Nabas', 'New Washington', 'Numancia', 'Tangalan']),
    Antique: createCityMap(['San Jose de Buenavista', 'Anini-y', 'Barbaza', 'Belison', 'Bugasong', 'Caluya', 'Culasi', 'Hamtic', 'Laua-an', 'Libertad', 'Pandan', 'Patnongon', 'San Remigio', 'Sebaste', 'Sibalom', 'Tibiao', 'Tobias Fornier', 'Valderrama']),
    Capiz: createCityMap(['Roxas City', 'Cuartero', 'Dao', 'Dumalag', 'Dumarao', 'Ivisan', 'Jamindan', 'Maayon', 'Mambusao', 'Panay', 'Panitan', 'Pilar', 'Pontevedra', 'President Roxas', 'Sapi-an', 'Sigma', 'Tapaz']),
    Guimaras: createCityMap(['Jordan', 'Buenavista', 'Nueva Valencia', 'San Lorenzo', 'Sibunag']),
    Iloilo: {
      'Iloilo City': ['Arevalo', 'Bolilao', 'Calaparan', 'City Proper', 'Cuartero', 'Delgado', 'Dungon', ' Guzman-Jesena', 'Hibao-an', 'Jaro', 'La Paz', 'Lapuz', 'Mandurriao', 'Molo', 'Nabitasan', 'Oñate de Leon', 'Quintin Salas', 'Sambag', 'San Isidro', 'San Rafael', 'Tabuc Suba', 'Tagbak', 'Ungka'],
      ...createCityMap(['Passi City', 'Ajuy', 'Alimodian', 'Anilao', 'Badiangan', 'Balasan', 'Banate', 'Barotac Nuevo', 'Barotac Viejo', 'Batad', 'Bingawan', 'Cabatuan', 'Calinog', 'Carles', 'Concepcion', 'Dingle', 'Dueñas', 'Dumangas', 'Estancia', 'Guimbal', 'Igbaras', 'Janiuay', 'Lambunao', 'Leganes', 'Lemery', 'Leon', 'Maasin', 'Miagao', 'Mina', 'New Lucena', 'Oton', 'Pavia', 'Pototan', 'San Dionisio', 'San Enrique', 'San Joaquin', 'San Miguel', 'San Rafael', 'Santa Barbara', 'Sara', 'Tigbauan', 'Tubungan', 'Zarraga']),
    },
    'Negros Occidental': {
      'Bacolod City': ['Alangilan', 'Alijis', 'Banago', 'Bata', 'Cabug', 'Estefania', 'Felisa', 'Granada', 'Handumanan', 'Mandalagan', 'Mansilingan', 'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport', 'Sum-ag', 'Taculing', 'Tangub', 'Villamonte', 'Vista Alegre'],
      ...createCityMap(['Bago City', 'Cadiz City', 'Escalante City', 'Himamaylan City', 'Kabankalan City', 'La Carlota City', 'Sagay City', 'San Carlos City', 'Silay City', 'Sipalay City', 'Talisay City', 'Victorias City', 'Binalbagan', 'Calatrava', 'Candoni', 'Cauayan', 'Enrique B. Magalona', 'Hinigaran', 'Hinoba-an', 'Ilog', 'Isabela', 'La Castellana', 'Manapla', 'Moises Padilla', 'Murcia', 'Pontevedra', 'Pulupandan', 'Salvador Benedicto', 'San Enrique', 'Toboso', 'Valladolid']),
    },
  },
  'Region VIII (Eastern Visayas)': {
    Biliran: createCityMap(['Naval', 'Almeria', 'Biliran', 'Cabucgayan', 'Caibiran', 'Culaba', 'Kawayan', 'Maripipi']),
    'Eastern Samar': createCityMap(['Borongan City', 'Arteche', 'Balangiga', 'Balangkayan', 'Can-avid', 'Dolores', 'General MacArthur', 'Giporlos', 'Guiuan', 'Hernani', 'Jipapad', 'Lawaan', 'Llorente', 'Maslog', 'Maydolong', 'Mercedes', 'Oras', 'Quinapondan', 'Salcedo', 'San Julian', 'San Policarpo', 'Sulat', 'Taft']),
    Leyte: {
      'Tacloban City': ['Abucay', 'Apitong', 'Bagacay', 'Caibaan', 'Calanipawan', 'Diit', 'Fatima', 'Marasbaras', 'Nula-Tula', 'Palanog', 'Poblacion', 'Sagkahan', 'San Jose', 'San Roque', 'Santa Elena', 'Santo Niño', 'Tigbao', 'Utap', 'V&G Subdivision'],
      'Ormoc City': ['Airport', 'Alegria', 'Alta Vista', 'Bagong', 'Bagong Buhay', 'Bantigue', 'Barangay 1–29 (Poblacion)', 'Batuan', 'Camp Downes', 'Can-adieng', 'Can-untog', 'Cogon Combado', 'Dayhagan', 'Dolores', 'Domonar', 'Don Felipe Larrazabal', 'Donghol', 'Ipil', 'Lao', 'Linao', 'Macabug', 'Margen', 'Mas-in', 'Matica-a', 'Milagro', 'Monterico', 'Naungan', 'Punta', 'Salvacion', 'San Isidro', 'San Jose', 'San Pablo', 'San Vicente', 'Santo Niño', 'Simangan', 'Tambulilid', 'Tongonan', 'Valencia'],
      ...createCityMap(['Baybay City', 'Abuyog', 'Alangalang', 'Albuera', 'Babatngon', 'Barugo', 'Bato', 'Burauen', 'Calubian', 'Capoocan', 'Carigara', 'Dagami', 'Dulag', 'Hilongos', 'Hindang', 'Inopacan', 'Isabel', 'Jaro', 'Javier', 'Julita', 'Kananga', 'La Paz', 'Leyte', 'MacArthur', 'Mahaplag', 'Matag-ob', 'Matalom', 'Mayorga', 'Merida', 'Palo', 'Palompon', 'Pastrana', 'San Isidro', 'San Miguel', 'Santa Fe', 'Tabango', 'Tabontabon', 'Tanauan', 'Tolosa', 'Tunga', 'Villaba']),
    },
    'Northern Samar': createCityMap(['Catarman', 'Allen', 'Biri', 'Bobon', 'Capul', 'Catubig', 'Gamay', 'Laoang', 'Lapinig', 'Las Navas', 'Lavezares', 'Lope de Vega', 'Mapanas', 'Mondragon', 'Palapag', 'Pambujan', 'Rosario', 'San Antonio', 'San Isidro', 'San Jose', 'San Roque', 'San Vicente', 'Silvino Lobos', 'Victoria']),
    Samar: createCityMap(['Catbalogan City', 'Calbayog City', 'Almagro', 'Basey', 'Calbiga', 'Daram', 'Gandara', 'Hinabangan', 'Jiabong', 'Marabut', 'Matuguinao', 'Motiong', 'Pagsanghan', 'Paranas', 'Pinabacdao', 'San Jorge', 'San Jose de Buan', 'San Sebastian', 'Santa Margarita', 'Santa Rita', 'Santo Niño', 'Tagapul-an', 'Talalora', 'Tarangnan', 'Villareal', 'Zumarraga']),
    'Southern Leyte': createCityMap(['Maasin City', 'Anahawan', 'Bontoc', 'Hinunangan', 'Hinundayan', 'Libagon', 'Liloan', 'Limasawa', 'Macrohon', 'Malitbog', 'Padre Burgos', 'Pintuyan', 'Saint Bernard', 'San Francisco', 'San Juan (Cabalian)', 'San Ricardo', 'Silago', 'Sogod', 'Tomas Oppus']),
  },
  'Region IX (Zamboanga Peninsula)': {
    'Zamboanga del Norte': createCityMap(['Dipolog City', 'Dapitan City', 'Bacungan', 'Baliguian', 'Godod', 'Gutalac', 'Jose Dalman', 'Kalawit', 'Katipunan', 'La Libertad', 'Labason', 'Liloy', 'Manukan', 'Mutia', 'Piñan', 'Polanco', 'President Manuel A. Roxas', 'Rizal', 'Salug', 'Sergio Osmeña Sr.', 'Siayan', 'Sibuco', 'Sibutad', 'Sindangan', 'Siocon', 'Sirawai', 'Tampilisan']),
    'Zamboanga del Sur': createCityMap(['Zamboanga City', 'Pagadian City', 'Aurora', 'Bayog', 'Dimataling', 'Dinas', 'Dumalinao', 'Dumingag', 'Guipos', 'Josefina', 'Kumalarang', 'Labangan', 'Lakewood', 'Lapuyan', 'Mahayag', 'Margosatubig', 'Midsalip', 'Molave', 'Pitogo', 'Ramon Magsaysay', 'San Miguel', 'San Pablo', 'Sominot', 'Tabina', 'Tambulig', 'Tigbao', 'Tukuran', 'Vincenzo A. Sagun']),
    'Zamboanga Sibugay': createCityMap(['Ipil', 'Alicia', 'Buug', 'Diplahan', 'Imelda', 'Kabasalan', 'Mabuhay', 'Malangas', 'Naga', 'Olutanga', 'Payao', 'Roseller Lim', 'Siay', 'Talusan', 'Titay', 'Tungawan']),
  },
  'Region X (Northern Mindanao)': {
    Bukidnon: createCityMap(['Malaybalay City', 'Valencia City', 'Baungon', 'Cabanglasan', 'Damulog', 'Dangcagan', 'Don Carlos', 'Impasugong', 'Kadingilan', 'Kalilangan', 'Kibawe', 'Kitaotao', 'Lantapan', 'Libona', 'Malitbog', 'Manolo Fortich', 'Maramag', 'Pangantucan', 'Quezon', 'San Fernando', 'Sumilao', 'Talakag']),
    Camiguin: createCityMap(['Mambajao', 'Catarman', 'Guinsiliban', 'Mahinog', 'Sagay']),
    'Lanao del Norte': createCityMap(['Iligan City', 'Tubod', 'Bacolod', 'Baloi', 'Baroy', 'Kapatagan', 'Kauswagan', 'Kolambugan', 'Lala', 'Linamon', 'Magsaysay', 'Maigo', 'Matungao', 'Munai', 'Nunungan', 'Pantao Ragat', 'Pantar', 'Poona Piagapo', 'Salvador', 'Sapad', 'Sultan Naga Dimaporo', 'Tagoloan', 'Tangcal']),
    'Misamis Occidental': createCityMap(['Oroquieta City', 'Ozamiz City', 'Tangub City', 'Aloran', 'Baliangao', 'Bonifacio', 'Calamba', 'Clarin', 'Concepcion', 'Don Victoriano Chiongbian', 'Jimenez', 'Lopez Jaena', 'Panaon', 'Plaridel', 'Sapang Dalaga', 'Sinacaban', 'Tudela']),
    'Misamis Oriental': {
      'Cagayan de Oro City': ['Agusan', 'Balulang', 'Bayabas', 'Bonbon', 'Bugo', 'Bulua', 'Camaman-an', 'Canito-an', 'Carmen', 'Consolacion', 'Cugman', 'Gusa', 'Indahag', 'Ipunan', 'Kauswagan', 'Lapasan', 'Lumbia', 'Macabalan', 'Macasandig', 'Nazareth', 'Patag', 'Poblacion', 'Puerto', 'Puntod', 'Tablon'],
      ...createCityMap(['El Salvador City', 'Gingoog City', 'Alubijid', 'Balingasag', 'Balingoan', 'Binuangan', 'Claveria', 'Gitagum', 'Initao', 'Jasaan', 'Kinoguitan', 'Lagonglong', 'Laguindingan', 'Libertad', 'Lugait', 'Magsaysay', 'Manticao', 'Medina', 'Naawan', 'Opol', 'Salay', 'Sugbongcogon', 'Tagoloan', 'Talisayan', 'Villanueva']),
    },
  },
  'Region XI (Davao Region)': {
    'Davao de Oro': createCityMap(['Nabunturan', 'Compostela', 'Laak', 'Mabini', 'Maco', 'Maragusan', 'Mawab', 'Monkayo', 'Montevista', 'New Bataan', 'Pantukan']),
    'Davao del Norte': createCityMap(['Tagum City', 'Panabo City', 'Samal City (IGACOS)', 'Asuncion', 'Braulio E. Dujali', 'Carmen', 'Kapalong', 'New Corella', 'San Isidro', 'Santo Tomas', 'Talaingod']),
    'Davao del Sur': {
      'Davao City': ['Agdao', 'Bago Aplaya', 'Bago Gallera', 'Bajada', 'Bangsawan', 'Buhangin', 'Bunawan', 'Cabantian', 'Calinan', 'Catalunan Grande', 'Catalunan Pequeño', 'Communal', 'Daliao', 'Dumoy', 'Indangan', 'Lanang', 'Lasang', 'Maa', 'Matina Aplaya', 'Matina Crossing', 'Matina Pangi', 'Mintal', ' Pampanga', 'Panacan', 'Poblacion', 'Sasa', 'SIR Matina', 'Talomo', 'Tugbok', 'Toril', 'Ulas'],
      ...createCityMap(['Digos City', 'Bansalan', 'Hagonoy', 'Kiblawan', 'Magsaysay', 'Malalag', 'Matanao', 'Padada', 'Santa Cruz', 'Sulop']),
    },
    'Davao Occidental': createCityMap(['Malita', 'Don Marcelino', 'Jose Abad Santos', 'Santa Maria', 'Sarangani']),
    'Davao Oriental': createCityMap(['Mati City', 'Baganga', 'Banaybanay', 'Boston', 'Caraga', 'Cateel', 'Governor Generoso', 'Lupon', 'Manay', 'San Isidro', ' Tarragona']),
  },
  'Region XII (SOCCSKSARGEN)': {
    Cotabato: createCityMap(['Kidapawan City', 'Alamada', 'Aleosan', 'Antipas', 'Arakan', 'Banisilan', 'Carmen', 'Kabacan', 'Libungan', 'M’lang', 'Magpet', 'Makilala', 'Matalam', 'Midsayap', 'Pigcawayan', 'Pikit', 'President Roxas', 'Tulunan']),
    Sarangani: createCityMap(['Alabel', 'Glan', 'Kiamba', 'Maasim', 'Maitum', 'Malapatan', 'Malungon']),
    'South Cotabato': createCityMap(['General Santos City', 'Koronadal City', 'Banga', 'Lake Sebu', 'Norala', 'Polomolok', 'Santo Niño', 'Surallah', 'T’Boli', 'Tampakan', 'Tantangan', 'Tupi']),
    'Sultan Kudarat': createCityMap(['Tacurong City', 'Isulan', 'Bagumbayan', 'Columbio', 'Esperanza', 'Kalamansig', 'Lambayong', 'Lebak', 'Lutayan', 'Palimbang', 'President Quirino', 'Sen. Ninoy Aquino']),
  },
  'Region XIII (Caraga)': {
    'Agusan del Norte': createCityMap(['Butuan City', 'Cabadbaran City', 'Buenavista', 'Carmen', 'Jabonga', 'Kitcharao', 'Las Nieves', 'Magallanes', 'Nasipit', 'Remedios T. Romualdez', 'Santiago', 'Tubay']),
    'Agusan del Sur': createCityMap(['Bayugan City', 'Prosperidad', 'Bunawan', 'Esperanza', 'La Paz', 'Loreto', 'Rosario', 'San Francisco', 'San Luis', 'Santa Josefa', 'Sibagat', 'Talacogon', 'Trento', 'Veruela']),
    'Dinagat Islands': createCityMap(['San Jose', 'Basilisa', 'Cagdianao', 'Dinagat', 'Libjo', 'Loreto', 'Tubajon']),
    'Surigao del Norte': createCityMap(['Surigao City', 'Alegria', 'Bacuag', 'Burgos', 'Claver', 'Dapa', 'Del Carmen', 'General Luna (Siargao)', 'Gigaquit', 'Mainit', 'Malimono', 'Pilar', 'Placer', 'San Benito', 'San Francisco', 'San Isidro', 'Santa Monica', 'Sison', 'Socorro', 'Tagana-an', 'Tubod']),
    'Surigao del Sur': createCityMap(['Tandag City', 'Bislig City', 'Barobo', 'Bayabas', 'Cagwait', 'Cantilan', 'Carmen', 'Carrascal', 'Cortes', 'Hinatuan', 'Lanuza', 'Lianga', 'Lingig', 'Madrid', 'Marihatag', 'San Agustin', 'San Miguel', 'Tagbina', 'Tago']),
  },
  'BARMM (Bangsamoro Autonomous Region)': {
    Basilan: createCityMap(['Isabela City', 'Lamitan City', 'Akbar', 'Al-Barka', 'Hadji Mohammad Ajul', 'Hadji Muhtamad', 'Lantawan', 'Maluso', 'Sumisip', 'Tabuan-Lasa', 'Tipo-Tipo', 'Tuburan', 'Ungkaya Pukan']),
    'Lanao del Sur': createCityMap(['Marawi City', 'Bacolod-Kalawi', 'Balabagan', 'Balindong', 'Bayang', 'Binidayan', 'Buadiposo-Buntong', 'Bubong', 'Butig', 'Calanogas', 'Ditsaan-Ramain', 'Ganassi', 'Kapai', 'Kapatagan', 'Lumba-Bayabao', 'Lumbaca-Unayan', 'Lumbatan', 'Lumbayanague', 'Madalum', 'Madamba', 'Maguing', 'Malabang', 'Marantao', 'Marogong', 'Masiu', 'Mulondo', 'Pagayawan', 'Piagapo', 'Picong', 'Poona Bayabao', 'Pualas', 'Saguiaran', 'Sultan Dumalondong', 'Tagoloan II', 'Tamparan', 'Taraka', 'Tubaran', 'Tugaya', 'Wao']),
    'Maguindanao del Norte': createCityMap(['Cotabato City', 'Datu Odin Sinsuat', 'Barira', 'Buldon', 'Datu Blah T. Sinsuat', 'Kabuntalan', 'Matanog', 'Northern Kabuntalan', 'Parang', 'Sultan Kudarat', 'Sultan Mastura', 'Talitay', 'Upi']),
    'Maguindanao del Sur': createCityMap(['Buluan', 'Ampatuan', 'Datu Abdullah Sangki', 'Datu Anggal Midtimbang', 'Datu Hoffer Ampatuan', 'Datu Montawal', 'Datu Paglas', 'Datu Piang', 'Datu Salibo', 'Datu Saudi-Ampatuan', 'Datu Unsay', 'General Salipada K. Pendatun', 'Guindulungan', 'Mamasapano', 'Mangudadatu', 'Pagalungan', 'Paglat', 'Pandag', 'Rajah Buayan', 'Shariff Aguak', 'Shariff Saydona Mustapha', 'South Upi', 'Sultan sa Barongis', 'Talayan']),
    Sulu: createCityMap(['Jolo', 'Banguingui', 'Hadji Panglima Tahil', 'Indanan', 'Kalingalan Caluang', 'Lugus', 'Luuk', 'Maimbung', 'Old Panamao', 'Omar', 'Pandami', 'Panglima Estino', 'Pangutaran', 'Parang', 'Pata', 'Patikul', 'Siasi', 'Talipao', 'Tapul']),
    'Tawi-Tawi': createCityMap(['Bongao', 'Languyan', 'Mapun', 'Panglima Sugala', 'Sapa-Sapa', 'Sibutu', 'Simunul', 'Sitangkai', 'South Ubian', 'Tandubas', 'Turtle Islands']),
  },
};

export function getRegions() {
  return Object.keys(PHILIPPINE_LOCATIONS);
}

export function getProvincesByRegion(region) {
  if (!region || !PHILIPPINE_LOCATIONS[region]) return [];
  return Object.keys(PHILIPPINE_LOCATIONS[region]);
}

export function getCitiesByProvince(region, province) {
  if (!region || !province || !PHILIPPINE_LOCATIONS[region]?.[province]) return [];
  return Object.keys(PHILIPPINE_LOCATIONS[region][province]);
}

export function getBarangaysByCity(region, province, city) {
  if (!region || !province || !city || !PHILIPPINE_LOCATIONS[region]?.[province]?.[city]) return [];
  return PHILIPPINE_LOCATIONS[region][province][city];
}

/**
 * Composes a clean, standardized full delivery address string from structured parts.
 */
export function composeDeliveryAddress({ street = '', barangay = '', city = '', province = '', region = '' }) {
  const cleanStreet = String(street || '').trim();
  const cleanBarangay = String(barangay || '').trim();
  const cleanCity = String(city || '').trim();
  const cleanProvince = String(province || '').trim();
  const cleanRegion = String(region || '').trim();

  const parts = [];
  if (cleanStreet) parts.push(cleanStreet);
  if (cleanBarangay) {
    parts.push(/^brgy\.?\s/i.test(cleanBarangay) ? cleanBarangay : `Brgy. ${cleanBarangay}`);
  }
  if (cleanCity) parts.push(cleanCity);
  if (cleanProvince && cleanProvince.toLowerCase() !== cleanCity.toLowerCase()) {
    parts.push(cleanProvince);
  }
  if (cleanRegion) {
    const shortRegion = cleanRegion.replace(/\s*\(.*?\)\s*/, '').trim();
    parts.push(shortRegion || cleanRegion);
  }

  return parts.join(', ');
}

/**
 * Attempts to reverse-parse an existing flat delivery_address string into
 * { region, province, city, barangay, street } so the selectors auto-populate.
 */
export function parseStructuredAddress(rawAddress = '', existingMeta = {}) {
  const defaultResult = {
    region: existingMeta.region || DEFAULT_REGION,
    province: existingMeta.province || DEFAULT_PROVINCE,
    city: existingMeta.city || DEFAULT_CITY,
    barangay: existingMeta.barangay || '',
    street: existingMeta.street || '',
  };

  if (existingMeta.region && existingMeta.province && existingMeta.city && (existingMeta.barangay || existingMeta.street)) {
    return defaultResult;
  }

  const text = String(rawAddress || '').trim();
  if (!text || text.startsWith('Studio Counter') || text.startsWith('Studio Pickup')) {
    return defaultResult;
  }

  for (const [regionName, provinces] of Object.entries(PHILIPPINE_LOCATIONS)) {
    for (const [provinceName, cities] of Object.entries(provinces)) {
      for (const [cityName, barangays] of Object.entries(cities)) {
        if (text.toLowerCase().includes(cityName.toLowerCase())) {
          let matchedBrgy = '';
          for (const brgy of barangays) {
            const regex = new RegExp(`(?:brgy\\.?\\s*)?\\b${brgy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(text)) {
              matchedBrgy = brgy;
              break;
            }
          }

          let streetPart = text;
          if (matchedBrgy) {
            const brgyIdx = streetPart.toLowerCase().indexOf(matchedBrgy.toLowerCase());
            if (brgyIdx > 0) {
              streetPart = streetPart
                .slice(0, brgyIdx)
                .replace(/,?\s*brgy\.?\s*$/i, '')
                .replace(/,\s*$/, '')
                .trim();
            } else {
              streetPart = '';
            }
          } else {
            const cityIdx = streetPart.toLowerCase().indexOf(cityName.toLowerCase());
            if (cityIdx > 0) {
              streetPart = streetPart.slice(0, cityIdx).replace(/,\s*$/, '').trim();
            } else {
              streetPart = '';
            }
          }

          return {
            region: regionName,
            province: provinceName,
            city: cityName,
            barangay: matchedBrgy || defaultResult.barangay,
            street: streetPart || defaultResult.street,
          };
        }
      }
    }
  }

  return {
    ...defaultResult,
    street: text,
  };
}
