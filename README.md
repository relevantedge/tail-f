# tail -f.js

### Open-Source Website Analytics Tracker  

To meet requirements for collecting granular clickstream data with minimal effort, this is a modular, open-source website tracker. Simple to implement and GDRP friendly, the tracker reduces manual set up by automatically tracking website clicks as well as select web-session data. 

What makes the tracker unique is that it is designed to work independently of the website CMS technology that it tracks as well as the backend where the tracker posts data for use in analytics. This cross platform, cross-technology approach enables the tracker to be used with any CMS and any analytics tool.  

Based on its modular design, the tracker can be used, for example, to collect clickstream data on a Sitecore XM Cloud site or a WordPress site and send the data to Google Analytics 4 and or Sitecore CDP. The tracker can be used standalone or in combination with Google Tag Manager (GTM).  

Using the tracker, the same tracking can be used when migrating from one CMS and or analytics data collection platform to another. Similarly, if an organization uses several CMS platforms, the tracker supports the ability to track events consistently within and across the organization’s different sites. With this, a single multi-site dashboard for analytics can be provided. 

The tracker provides a standardized and open framework for data collection. Supporting first-party domain traffic and cookies only, the tracker enables governance and clarity of data flows between platforms. A key design objective of the tracker is to prevent tracked data from getting blocked, considering regulatory cookie compliance and initiatives such as Intelligent Tracking Prevention (ITP). 

In addition it takes extensive measures to prevent other tracking scripts there may be on the website to do fingerprinting based on the user's first party consented identifiers. 

The tracker is designed to support GDPR compliance and uses techniques to reduce blocks when using browsers such as Apple Safari and Firefox. The tracker’s architecture is based on a reverse proxy server. Communication between the user’s browser and analytics data collection takes place indirectly. This makes the tracker compliant based on recommendations from data protection in the EU and other regions. 

### Additional information
*We are still working on the website...*

**[Developer docs are here](https://github.com/relevantedge/tail-f/blob/main/src/npm/README.md)**.


**This project is maintained by [RelevantEdge](https://www.relevant-edge.com).**
