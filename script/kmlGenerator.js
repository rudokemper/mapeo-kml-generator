function parseUTMFromText(text) {
    const utmRegex = /UTM (\d{1,2}[A-Z]) (\d{6,7}) (\d{7,8})/;
    const match = text.match(utmRegex);
    if (match) {
        const zone = match[1];
        const easting = parseFloat(match[2]);
        const northing = parseFloat(match[3]);
        return { zone, easting, northing };
    } else {
        alert('UTM coordinates not found in the input text.');
        return null;
    }
}

function utmToLatLng(zone, easting, northing) {
    // This function uses the proj4 library to convert UTM coordinates to latitude/longitude
    const zoneNumber = parseInt(zone.slice(0, -1), 10);
    const isNorthernHemisphere = zone.slice(-1).toUpperCase() >= 'N';

    // Define the UTM projection string
    const utmProjString = `+proj=utm +zone=${zoneNumber} ${isNorthernHemisphere ? "+north" : "+south"} +datum=WGS84 +units=m +no_defs`;

    // Perform the transformation to WGS84 (latitude/longitude)
    const [lng, lat] = proj4(utmProjString, 'WGS84', [easting, northing]);

    console.log(`UTM (${zone}) -> Lat: ${lat}, Lng: ${lng}`);
    return { lat, lng };
}

function formatDateForFilename(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = date.getFullYear();
    return `${month}.${day}.${year}`;
}

function generateKML() {
    const message = document.getElementById("message").value;
    const utmData = parseUTMFromText(message);
    const image = document.getElementById("image").files[0];

    if (!utmData) return;

    const { zone, easting, northing } = utmData;
    const { lat, lng } = utmToLatLng(zone, easting, northing);

    const timestampMatch = message.match(/\b\w+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [APM]{2}\b/);
    const timestamp = timestampMatch ? timestampMatch[0] : 'Unknown Date';
    const formattedDate = formatDateForFilename(timestamp);

    // Extract each line of the message to find UTM coordinates and category
    const lines = message.split('\n').map(line => line.trim());
    const utmIndex = lines.findIndex(line => line.startsWith("UTM"));
    let category = 'Unknown Category';

    // Find the first non-empty line after the UTM coordinates
    if (utmIndex !== -1) {
        for (let i = utmIndex + 1; i < lines.length; i++) {
            if (lines[i]) {
                category = lines[i];
                break;
            }
        }
    }

    // If an image is provided, convert it to a base64 string
    if (image) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            finishKML(lat, lng, base64Image, formattedDate, timestamp, category);
        };
        reader.readAsDataURL(image);
    } else {
        finishKML(lat, lng, null, formattedDate, timestamp, category);
    }
}

function finishKML(lat, lng, base64Image, formattedDate, timestamp, category) {
    // Build the KML content with the image embedded in the <description> tag
    let kmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
            <Document>
                <Placemark>
                    <name>Mapeo Alert — ${category}</name>
                    <description><![CDATA[`;

    if (base64Image) {
        kmlContent += `<img src="${base64Image}" width="400"/><br/><br/>`;
    }

    kmlContent += `Category: ${category}<br/>
                    Timestamp: ${timestamp}<br/>
                    Mapeo Alert — Threat<br/>
                    ]]></description>
                    <ExtendedData>
                        <Data name="Category">
                            <value>${category}</value>
                        </Data>
                        <Data name="Timestamp">
                            <value>${timestamp}</value>
                        </Data>
                    </ExtendedData>
                    <Point>
                        <coordinates>${lng},${lat},0</coordinates>
                    </Point>
                </Placemark>
            </Document>
        </kml>`;

    // Remove unnecessary whitespace and format the KML content
    kmlContent = kmlContent
        .replace(/\n\s+/g, '')
        .replace(/>\s+</g, '><');       
   
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const link = document.getElementById("downloadLink");
    link.href = URL.createObjectURL(blob);
    link.download = `Mapeo Alert - ${category} - ${formattedDate}.kml`;
    link.style.display = 'block';
    link.textContent = 'Download KML';
}