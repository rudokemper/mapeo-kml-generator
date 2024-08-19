function parseUTMFromText(text) {
  const utmRegex = /UTM (\d{1,2}[A-Z]) (\d{6,7}) (\d{7,8})/;
  const match = text.match(utmRegex);
  if (match) {
    const zone = match[1];
    const easting = parseFloat(match[2]);
    const northing = parseFloat(match[3]);
    return { zone, easting, northing };
  } else {
    alert("UTM coordinates not found in the input text.");
    return null;
  }
}

function extractTimestamp(text) {
  // Format: Jun 12, 2024, 12:50 PM
  const timestampRegex1 = /\b\w+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [APM]{2}\b/;
  // Format: Monday, August 19, 2024 9:35:10 AM EDT
  const timestampRegex2 =
    /\b\w+,\s\w+ \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} [APM]{2} \w{3}\b/;

  const match1 = text.match(timestampRegex1);
  const match2 = text.match(timestampRegex2);

  if (match1) return match1[0];
  if (match2) return match2[0];
  return "Unknown Date";
}

function extractCategory(text, timestamp) {
  const categoryRegex = /Mapeo Alert — (.*?)(?=\bUTM|\b\w+ \d{1,2}, \d{4})/;
  const match = text.match(categoryRegex);
  if (match) {
    let category = match[1].trim();
    // Remove parts of the category that might mistakenly include the start of the date
    if (timestamp && category.endsWith(timestamp.split(" ")[0])) {
      category = category.replace(timestamp.split(" ")[0], "").trim();
    }
    return category;
  }
  return "Unknown Category";
}

function extractMetadata(text, utmData) {
  const utmEndIndex =
    text.indexOf(utmData.northing.toString()) +
    utmData.northing.toString().length;
  if (utmEndIndex !== -1) {
    const metadata = text.substring(utmEndIndex).trim();
    return metadata && metadata !== "" ? metadata : "";
  }
  return "";
}

function normalizeMessage(message) {
  return message
    .replace(/\s{2,}/g, " ")
    .replace(/— Sent from Mapeo —/g, "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n/g, " ")
    .trim();
}

function utmToLatLng(zone, easting, northing) {
  // This function uses the proj4 library to convert UTM coordinates to latitude/longitude
  const zoneNumber = parseInt(zone.slice(0, -1), 10);
  const isNorthernHemisphere = zone.slice(-1).toUpperCase() >= "N";

  // Define the UTM projection string
  const utmProjString = `+proj=utm +zone=${zoneNumber} ${
    isNorthernHemisphere ? "+north" : "+south"
  } +datum=WGS84 +units=m +no_defs`;

  // Perform the transformation to WGS84 (latitude/longitude)
  const [lng, lat] = proj4(utmProjString, "WGS84", [easting, northing]);

  console.log(
    `UTM (${zone}) ${easting} ${northing} -> Lat: ${lat}, Lng: ${lng}`
  );
  return { lat, lng };
}

function formatDateForFilename(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}.${day}.${year}`;
}

function generateKML() {
  // Normalize the input message
  const rawMessage = document.getElementById("message").value;
  const message = normalizeMessage(rawMessage);
  console.log("Normalized message:", message);

  // Extract UTM coordinates, timestamp, category, and metadata from the message
  const utmData = parseUTMFromText(message);
  const image = document.getElementById("image").files[0];

  if (!utmData) return;

  const { zone, easting, northing } = utmData;
  const { lat, lng } = utmToLatLng(zone, easting, northing);

  const timestamp = extractTimestamp(message);
  const formattedDate = formatDateForFilename(timestamp);

  const category = extractCategory(message, timestamp);
  const metadata = extractMetadata(message, utmData);

  // If an image is provided, convert it to a base64 string
  if (image) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const base64Image = e.target.result;
      finishKML(
        lat,
        lng,
        base64Image,
        formattedDate,
        timestamp,
        category,
        metadata
      );
    };
    reader.readAsDataURL(image);
  } else {
    finishKML(lat, lng, null, formattedDate, timestamp, category, metadata);
  }
}

function finishKML(
  lat,
  lng,
  base64Image,
  formattedDate,
  timestamp,
  category,
  metadata
) {
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
                                                </Data>`;

  if (metadata) {
    kmlContent += `<Data name="Metadata">
                            <value>${metadata}</value>
                        </Data>`;
  }

  kmlContent += `</ExtendedData>
                    <Point>
                        <coordinates>${lng},${lat},0</coordinates>
                    </Point>
                </Placemark>
            </Document>
        </kml>`;

  // Remove unnecessary whitespace and format the KML content
  kmlContent = kmlContent.replace(/\n\s+/g, "").replace(/>\s+</g, "><");

  // Log KML content without the image
  if (base64Image) {
    let kmlContentWithoutImage = kmlContent.replace(
      `<img src="${base64Image}" width="400"/><br/><br/>`,
      ""
    );
    console.log("Generated KML content (no image):", kmlContentWithoutImage);
  }

  const blob = new Blob([kmlContent], {
    type: "application/vnd.google-earth.kml+xml",
  });
  const link = document.getElementById("downloadLink");
  link.href = URL.createObjectURL(blob);
  link.download = `Mapeo Alert - ${category} - ${formattedDate}.kml`;
  link.style.display = "block";
  link.textContent = "Download KML";
}
