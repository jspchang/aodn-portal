// Extract Carbon Dioxide Data from CSV file
// args[0]: CSV file path
// args[1]: Database name(generated from grails environment)
import static Constants.*
import groovy.sql.Sql

class Constants {
	// Carbon Dioxide Survey Data Schema
	// Date,Time,Latitude,Longitude,Water temperature,Salinity,CO2,RecNo,mb Ref,mbR Temp,Oxygen,Input D,Input E,Input F,Input G,Input H,ATMP,Probe Type
	static final int              DATE = 0
	static final int              TIME = 1
	static final int          LATITUDE = 2
	static final int         LONGITUDE = 3
	static final int WATER_TEMPERATURE = 4
	static final int          SALINITY = 5
	static final int               CO2 = 6
	static final int             RECNO = 7
	static final int            MB_REF = 8
	static final int          MBR_TEMP = 9
	static final int            OXYGEN = 10
	static final int           INPUT_D = 11
	static final int           INPUT_E = 12
	static final int           INPUT_F = 13
	static final int           INPUT_G = 14
	static final int           INPUT_H = 15
	static final int              ATMP = 16
	static final int        PROBE_TYPE = 17
}

db = [url:"jdbc:postgresql://localhost:5432/${args[1]}", user:'aodn', password:'aodn', driver:'org.postgresql.Driver']
sql = Sql.newInstance(db.url, db.user, db.password, db.driver)

phenomena = [0, 0, 0, 0,
		'urn:ogc:def:phenomenon:OGC:1.0.30:watertemperature',
		'urn:ogc:def:phenomenon:OGC:1.0.30:salinity',
		'urn:ogc:def:phenomenon:OGC:1.0.30:co2',
		'urn:ogc:def:phenomenon:OGC:1.0.30:recno',
		'urn:ogc:def:phenomenon:OGC:1.0.30:mbref',
		'urn:ogc:def:phenomenon:OGC:1.0.30:mbrtemp',
		'urn:ogc:def:phenomenon:OGC:1.0.30:oxygen',
		'urn:ogc:def:phenomenon:OGC:1.0.30:inputd',
		'urn:ogc:def:phenomenon:OGC:1.0.30:inpute',
		'urn:ogc:def:phenomenon:OGC:1.0.30:inputf',
		'urn:ogc:def:phenomenon:OGC:1.0.30:inputg',
		'urn:ogc:def:phenomenon:OGC:1.0.30:inputh',
		'urn:ogc:def:phenomenon:OGC:1.0.30:atmp',
		'urn:ogc:def:phenomenon:OGC:1.0.30:probetype'
]

def csvfile = new File(args[0])
csvfile.eachLine { line, index ->

	if (index == 1) { // header line
		// Validate schema
		if (validateSchema(line.split(',')) == false) {
			System.err << "ERROR: schema validation error"
			System.exit(-1) // Validation error number: -1
		}
	}

	if (index > 2) { // Ignore units line, start getting values
		if (line.endsWith(',')) line += '0'
		String[] values = line.split(',')
		String foiId

		try {
			foiId = getFoi(values)
		}
		catch(Exception e) {
			System.err << "ERROR: geom data error at line: ${index}"
			System.exit(-2) // Geom data error number: -2
		}

		if (findFoi(foiId)) {
		  try {
		    removeFromFoi(foiId, values)
		  }
		  catch(Exception e) {
		    System.err << "ERROR: Failed to remove observation at line: ${index}"
		    System.exit(-4) // Duplicate observation error number: -4
		  }
		}

	}

}

sql.close()
System.exit(0) // quit normally

private Boolean validateSchema(String[] attrs) {
	// Date,Time,Latitude,Longitude,Water temperature,Salinity,CO2,RecNo,mb Ref,mbR Temp,Oxygen,Input D,Input E,Input F,Input G,Input H,ATMP,Probe Type
	assertion = true
	assertion = assertion && (attrs[DATE].equalsIgnoreCase('Date')) \
    && (attrs[TIME].equalsIgnoreCase('Time')) \
    && (attrs[LATITUDE].equalsIgnoreCase('Latitude')) \
    && (attrs[LONGITUDE].equalsIgnoreCase('Longitude')) \
    && (attrs[WATER_TEMPERATURE].equalsIgnoreCase('Water temperature')) \
    && (attrs[SALINITY].equalsIgnoreCase('Salinity')) \
    && (attrs[CO2].equalsIgnoreCase('CO2')) \
    && (attrs[RECNO].equalsIgnoreCase('RecNo')) \
    && (attrs[MB_REF].equalsIgnoreCase('mb Ref')) \
    && (attrs[MBR_TEMP].equalsIgnoreCase('mbR Temp')) \
    && (attrs[OXYGEN].equalsIgnoreCase('Oxygen')) \
    && (attrs[INPUT_D].equalsIgnoreCase('Input D')) \
    && (attrs[INPUT_E].equalsIgnoreCase('Input E')) \
    && (attrs[INPUT_F].equalsIgnoreCase('Input F')) \
    && (attrs[INPUT_G].equalsIgnoreCase('Input G')) \
    && (attrs[INPUT_H].equalsIgnoreCase('Input H')) \
    && (attrs[ATMP].equalsIgnoreCase('ATMP')) \
    && (attrs[PROBE_TYPE].equalsIgnoreCase('Probe Type'))
}

private String getFoi(String[] attrs) {
	sqlString = "SELECT GeometryFromText('POINT(" + (attrs[LONGITUDE] ?: 0) + " " + (attrs[LATITUDE] ?: 0) + ")', 4326) AS foi_id"

	def foiId

	sql.eachRow(sqlString) { row ->
		foiId = row.foi_id
	}

	return foiId
}

private Boolean findFoi(String foiId) {
	sqlString = "SELECT * FROM feature_of_interest WHERE feature_of_interest_id = ${foiId}"
	rows = sql.rows(sqlString)

	return rows.size() > 0
}

private void removeFoi(String foiId, String[] attrs) {
	sql.execute("DELETE FROM proc_foi WHERE procedure_id='urn:ogc:object:feature:Sensor:IFGI:ifgi-sensor-1' and feature_of_interest_id='"+foiId+"'")
	sql.execute("DELETE FROM foi_off WHERE feature_of_interest_id='"+foiId+"' and offering_id='GAUGE_HEIGHT' ")
	sql.execute("DELETE FROM feature_of_interest WHERE feature_of_interest_id='"+foiId+"'")
}

private void removeFromFoi(String foiId, String[] attrs) {
	def timestamp = "${attrs[DATE]} ${attrs[TIME]}"

	for (phenomenon in WATER_TEMPERATURE..PROBE_TYPE) {
		sql.execute("DELETE FROM observation WHERE time_stamp=to_timestamp('" + timestamp + "', 'DD/MM/YYYY HH24:MI:SS') and procedure_id='urn:ogc:object:feature:Sensor:IFGI:ifgi-sensor-1' and feature_of_interest_id='" + foiId + "' and phenomenon_id='" + phenomena[phenomenon] + "' and offering_id='GAUGE_HEIGHT'")
	}
}
