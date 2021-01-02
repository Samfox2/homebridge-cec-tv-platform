# homebridge-cec-tv-platform
TV CEC client plugin for homebridge: https://github.com/nfarina/homebridge

The plugin is based on homebridge-cec from Dominick Han (dominick-han) but uses platform toolkit.

[![NPM Version](https://img.shields.io/npm/v/homebridge-cec-tv-platform.svg)](https://www.npmjs.com/package/homebridge-cec-tv-platform)

[![npm](https://img.shields.io/npm/dt/homebridge-cec-tv-platform.svg)](https://www.npmjs.com/package/homebridge-cec-tv-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/samfox2/homebridge-cec-tv-platform.svg)](https://github.com/samfox2/homebridge-cec-tv-platform)

Homebridge plugin to control a TV via CEC protocol (power on/off, volume +/-, source selection)
### Prerequisite
CEC-Enabled device. Raspberry Pi (tested working) or Pulse-Eight's [USB - CEC Adapter](https://www.pulse-eight.com/p/104/usb-hdmi-cec-adapter)

## Installation
1. Install [homebridge](https://www.npmjs.com/package/homebridge)
2. Install this plugin using: `sudo npm install -g homebridge-cec-tv-platform`
3. Install `cec-utils` if `cec-client` command is not present: `sudo apt-get install cec-utils`  
*Note: On Raspberry Pi's OSMC image, `cec-cilent` is present at `/usr/osmc/bin/cec-client-4.0.2`, need to run `sudo ln -s /usr/osmc/bin/cec-client-4.0.2 /usr/bin/cec-client` to link it to default `$PATH`*  
4. Add `CEC` platform to your configuration file (See below for examples)  
*Note: You might have to disable Kodi's (if installed) build in CEC functionality as it will interfere with this plugin*

### Minimal config
```json
   "platforms": [
    {
        "platform": "HomebridgeCECTV",
        "accessories": [
            {
                "name": "TOSHIBA",
                "devices": [
                    {
                        "1": "Sat Receiver",
                        "2": "Apple TV"
                    }
                ]
            }
        ]
    }
] 
```

### Full config (with optional parameters)
See [config-sample.json](config-sample.json)

## Configurations
### Platform
Field           | Required?    | Description
----------------|--------------|-------------
**platform**    | **Required** | Must be "HomebridgeCECTV".
**devices**     |  Required for source-switching  | A JSON array, containing objects specified from below.
  name          |  *Optional*  | Name displayed in Home app.
  manufacturer  |  *Optional*  | Manufacturer displayed in Home app.
  model         |  *Optional*  | Model displayed in Home app.
  serial        |  *Optional*  | Serial# displayed in Home app.

### "devices" entry
Field           | Required?    | Description
----------------|--------------|-------------
**name**        | **Required** | Name displayed in Home app.
**address**     | **Required** | Physical address as specified in HDMI-CEC standard.
  manufacturer  |  *Optional*  | Manufacturer displayed in Home app.
  model         |  *Optional*  | Model displayed in Home app.
  serial        |  *Optional*  | Serial# displayed in Home app.
