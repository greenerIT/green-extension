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

- User interactions are detected by activity-specific content scripts
- Data is sent to background.js using the Chrome Messaging API
- Carbon emission estimation currently uses:
  - Mocked CO₂ intensity values
  - Country-based energy intensity assumptions
- The architecture supports future integration of:
  - Real-time carbon intensity data
  - Network and data center emissions



## Limitations

- Streaming activities (e.g., YouTube, Spotify):
  - Highly variable
  - Depend on device hardware, resolution, and network type  
  Emission values should be considered approximations



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
