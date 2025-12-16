# Green Extension 

Green Extension is a sustainability-focused Chrome extension. The goal of the project is to estimate and visualize the carbon emissions of users’ digital activities, based on the electricity carbon intensity of the country they are located in.

Currently, the extension supports the following countries:
- Iceland
- Germany
- Czech Republic

The implementation is designed to be scalable, allowing additional countries and activity types to be added easily.



## Motivation

Digital services such as streaming, emailing, and downloading rely on electricity-intensive infrastructures.  
Green Extension aims to:
- Raise awareness about the environmental impact of everyday digital activities
- Show how carbon intensity varies by country
- Encourage more sustainable user behavior through feedback and suggestions



## Resources and References

The project is based on:
- Electricity Maps (carbon intensity data)
- Building Green Software by Anne Currie, Sara Bergman, Sara Hsu
- Green IT course materials
- Continuous feedback from THWS, RU and UUN professors



## Extension Architecture

The extension follows the standard Chrome Extension architecture and consists of the following components:

### Content Scripts
- Track user activities directly within web pages
- Activity-specific trackers:
  - youtube-tracker.js
  - spotify-tracker.js
  - gmail-tracker.js
- Send collected activity data to the service worker using the Chrome Messaging API

### Service Worker
- Implemented in background.js
- Receives messages from content scripts
- Handles carbon emission calculations
- Manages country-specific configuration and logic

### Popup Interface
- Defined in popup.html and popup.js
- Displays estimated carbon emissions
- Shows activity-based emission categories
- Provides greener usage suggestions

### Manifest
- manifest.json defines permissions, scripts, and extension configuration



## File Structure

```bash
GREEN-EXTENSION/  
├── icons/  
│   ├── icon16.png  
│   ├── icon32.png  
│   ├── icon48.png  
│   └── icon128.png  
│  
├── background.js  
├── gmail-tracker.js  
├── spotify-tracker.js  
├── youtube-tracker.js  
│  
├── popup.html  
├── popup.js  
│  
├── manifest.json  
├── README.md  
```

## Implementation Basics

### Data Collection and Processing

- User interactions are detected by activity-specific content scripts.
- Collected data is sent to `background.js` using the Chrome Messaging API.
- Carbon emission estimation uses the **Electricity Maps Forecast API** to fetch CO₂ intensity data, combined with country-based energy intensity assumptions per GB. API endpoint used: (`/v3/carbon-intensity/forecast`).
- The user selects their country when first using the extension, and this selection persists until it is changed manually.
- Daily carbon emissions are accumulated and displayed as a daily total, which resets at the start of the next day.

### Visualization and Categorization

- Carbon emission estimates are categorized by activity.
- Activity-based categorization is displayed only after relevant activities occur; otherwise, the message *"No categorization data is available yet"* is shown.
- The current electricity grid status is displayed in the popup as a badge, indicating how carbon-intensive the electricity grid is at that moment. This visual feedback aims to increase user awareness of how clean or carbon-intensive the electricity supply is in real time.
- The architecture supports future integration of more granular and real-time carbon intensity data.

## Limitations

- Carbon emission of streaming activities like YouTube and Spotify:
  - Highly variable
  - Depend on device hardware, resolution, and network type  
  
  Emission values should be considered approximations.


## How to Install and Use the Extension

### Installation 

1. Clone or download the project repository to your local machine.
2. Open **Google Chrome** and navigate to:

```html
chrome://extensions
```

3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the root folder of the project
6. The Green Extension icon will appear in the Chrome toolbar.

### How to Use 

1. Open a supported website such as:
- Google Drive
- Gmail  
- YouTube  


2. Interact with the platform normally:
- Download a file 
- Send an email
- Watch a Youtube video  
  

3. The content scripts automatically detect activity-related interactions.

4. Click on the **Green Extension icon** in the Chrome toolbar to open the popup.

5. The popup displays:
- Estimated carbon emissions in daily total
- Country selection     
- Greener usage suggestions  
- Activity categories  

---


## Sustainability Disclaimer

Green Extension provides estimates for educational and awareness purposes.  
The results are not exact measurements but aim to support informed and more sustainable digital behavior.



## Contributors
- Irmak Damla Özdemir, THWS 
- Tomáš Zenáhlík, UUN  
- Nastassia Herman, RU
- Jan Klablena, UUN  
- Maximilian Fehr, THWS  
- Matylda Marinicová, UUN  



## License

This project is developed for academic and educational purposes.  
License information can be added if required.
