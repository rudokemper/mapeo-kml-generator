# Mapeo KML Generator

This project allows you to generate KML files from Mapeo data shared on WhatsApp. The generated KML files can be used in applications like Google Earth to visualize the data.

## Features

- Parse UTM coordinates from WhatsApp messages.
- Convert UTM coordinates to latitude and longitude using the `proj4` library.
- Extract and format timestamp and Mapeo category from messages.
- Embed images in the KML file.
- Generate a downloadable KML file with the extracted data.