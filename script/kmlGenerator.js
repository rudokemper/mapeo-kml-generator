function parseUTMFromText(location) {
  const utmRegex = /UTM (\d{1,2}[A-Z]) (\d{6,7}) (\d{7,8})/;
  const match = location.match(utmRegex);
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
  // English and Spanish month names
  // Add more languages if needed (to avoid using a library for this simple task)
  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ].join("|");

  const timestampRegex3 = new RegExp(`\\b\\d{1,2} (${monthNames})\\.?,? \\d{4} \\d{1,2}:\\d{2}\\b`, "i");

  // Existing formats
  const timestampRegex1 = /\b\w+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [APM]{2}\b/;
  const timestampRegex2 = /\b\w+,\s\w+ \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} [APM]{2} \w{3}\b/;

  const match1 = text.match(timestampRegex1);
  const match2 = text.match(timestampRegex2);
  const match3 = text.match(timestampRegex3);

  if (match1) return match1[0];
  if (match2) return match2[0];
  if (match3) return match3[0];
  return "Unknown Date";
}

function normalizeMessage(message) {
  const lines = message.trim().split('\n');
  const lastLine = lines[lines.length - 1].trim();

  if (/^—.*?—$/.test(lastLine)) {
    lines.pop();
  }

  const [title, category] = lines[0].split("—").map(part => part.trim());

  const messageObject = {
    title: title || "Unknown Title",
    category: category || "Unknown Category",
    date: lines[1] || "Unknown Date",
    location: lines[2] || "Unknown Location",
    metadata: lines.slice(3).filter(line => line.trim() !== '')
  };

  return messageObject;
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

let messages = [];

function addToKML() {
  const rawMessage = document.getElementById("message").value;
  const messageObject = normalizeMessage(rawMessage);
  console.log("Normalized message:", messageObject);

  const utmData = parseUTMFromText(messageObject.location);
  if (!utmData) return;

  const { zone, easting, northing } = utmData;
  const { lat, lng } = utmToLatLng(zone, easting, northing);

  const timestamp = extractTimestamp(messageObject.date);
  const formattedDate = formatDateForFilename(timestamp);

  const image = document.getElementById("image").files[0];
  if (image) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const base64Image = e.target.result;
      messages.push({ ...messageObject, lat, lng, base64Image, formattedDate, timestamp });
      updateUI();
    };
    reader.readAsDataURL(image);
  } else {
    messages.push({ ...messageObject, lat, lng, base64Image: null, formattedDate, timestamp });
    updateUI();
  }
}

function updateUI() {
  document.getElementById("message").value = '';
  document.getElementById("image").value = '';

  const downloadLabel = document.getElementById("downloadLabel");
  downloadLabel.textContent = `Finalized KML output: ${messages.length} messages`;
  downloadLabel.style.display = "block";

  const link = document.getElementById("downloadLink");
  link.style.display = "block";
  link.textContent = "Download KML";
}

function downloadKML() {
  let kmlContent = `
    <?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>`;

  messages.forEach(({ title, lat, lng, base64Image, formattedDate, timestamp, category, metadata }) => {
    kmlContent += `
      <Placemark>
        <name>${title} — ${category}</name>
        <description><![CDATA[`;

    if (base64Image) {
      kmlContent += `<img src="${base64Image}" width="400"/><br/><br/>`;
    }

    kmlContent += `Category: ${category}<br/>
        Timestamp: ${timestamp}<br/>
        ${title} — ${category}<br/>
        ]]></description>
        <ExtendedData>
          <Data name="Category">
            <value>${category}</value>
          </Data>
          <Data name="Timestamp">
            <value>${timestamp}</value>
          </Data>`;

    if (metadata && metadata.length > 0) {
      const metadataContent = metadata.join('<br/>');
      kmlContent += `<Data name="Metadata">
            <value>${metadataContent}</value>
          </Data>`;
    }

    kmlContent += `</ExtendedData>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
      </Placemark>`;
  });

  kmlContent += `
      </Document>
    </kml>`;

  kmlContent = kmlContent.replace(/\n\s+/g, "").replace(/>\s+</g, "><");

  const blob = new Blob([kmlContent], {
    type: "application/vnd.google-earth.kml+xml",
  });
  const link = document.getElementById("downloadLink");
  link.href = URL.createObjectURL(blob);
  link.download = "Mapeo data.kml";
}