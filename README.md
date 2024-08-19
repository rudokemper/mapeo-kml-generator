# Mapeo KML Generator

This project allows you to generate KML files from Mapeo data shared on WhatsApp. The generated KML files can be used in applications like Google Earth to visualize the data.

## Features

- Parse UTM coordinates from WhatsApp messages.
- Convert UTM coordinates to latitude and longitude using the `proj4` library.
- Extract and format timestamp and Mapeo category from messages.
- Embed images in the KML file.
- Generate a downloadable KML file with the extracted data.

## Tested formats

### Mapeo

```
Mapeo Alert — Gold mining
Aug 19, 2024, 12:01 PM
UTM 18S 320000 4300000

My notes about gold mining

Gold mining:  
Alluvial

— Sent from Mapeo —
```

### CoMapeo

```
Mapeo Alert — Gold mining Monday, August 19, 2024 9:35:10 AM EDT UTM 18S 320000 4300000
```