const events = require('events');
const { spawn } = require('child_process');
const cecClient = spawn('cec-client', ['-d', '8']);
const tvEvent = new events.EventEmitter();

let Service, Characteristic, Homebridge, Accessory;


const PLUGIN_NAME = 'homebridge-cec-tv-platform';
const PLATFORM_NAME = 'HomebridgeCECTV';
//const LIMIT_RETRY 	= 5;

module.exports = (homebridge) => {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Homebridge = homebridge;
	Accessory = homebridge.platformAccessory;
	homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, CECTVPluginPlatform, true);
};

class CECTVPlugin {
	constructor(log, config, api) {
		if (!config) return;

		this.log = log;
		this.config = config;
		this.api = api;

		// Configuration
		this.name = this.config.name || 'CEC Television';
		this.model = this.config.model || 'TV';
		this.manufacturer = this.config.manufacturer || 'N/A';
		this.serial = this.config.serial || 'N/A';

		this.log.info(`Creating: ${this.name}`);

		//// Interval
		//this.interval = this.config.interval || 5000;
		//// Can't be lower than 300 miliseconds, it will flood your network
		//if (this.interval < 300) this.interval = 300;



		//// Variable
		//this.awake = false;
		//this.currentAppIndex = 0;
		//this.currentAppOnProgress = false;
		//this.checkPowerOnProgress = false;
		//this.prevStdout = "";
		//this.limit_retry = LIMIT_RETRY;


		/**
		 * Create the accessory
		 */

		// generate a UUID
		const uuid = this.api.hap.uuid.generate('homebridge:cectv-plugin' + this.name);

		// create the external accessory
		this.tv = new this.api.platformAccessory(this.name, uuid);

		// set the external accessory category
		this.tv.category = this.api.hap.Categories.TELEVISION;

		// add the tv service
		this.tvService = this.tv.addService(Service.Television);

		// get the tv information
		this.tvInfo = this.tv.getService(Service.AccessoryInformation);

		// set tv service name
		this.tvService
			.setCharacteristic(Characteristic.ConfiguredName, this.name)
			.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);


		// Inputs
		this.inputs = this.config.devices;
		if (!this.inputs) this.inputs = [];


		for (var i in this.inputs)
		{
			let name = this.inputs.name;
			let service = this.tv.addService(Service.InputSource, `Input - ${name}`, i);
			service
				.setCharacteristic(Characteristic.Identifier, i)
				.setCharacteristic(Characteristic.ConfiguredName, name)
				//.setCharacteristic(Characteristic.InputSourceType, type)
				//.setCharacteristic(Characteristic.TargetVisibilityState, targetVisibility)
				//.setCharacteristic(Characteristic.CurrentVisibilityState, currentVisibility)
				.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
				.setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION);
			this.tvService.addLinkedService(service);

			if (configured == Characteristic.IsConfigured.CONFIGURED) {
				this.inputs[i].service = service;
			}
		};




		//this.inputs = Object.entries(this.config.devices).map(([port, name]) => {
		//	let service = this.tv.addService(Service.InputSource, `inputSource${port}`);
		//	service
		//		.setCharacteristic(Characteristic.Identifier, port)
		//		.setCharacteristic(Characteristic.ConfiguredName, name)
		//		.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
		//		.setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION);
		//	this.tvService.addLinkedService(service);
		//});


		/**
	 * Create a speaker service to allow volume control
	 */
		this.tvSpeakerService = this.tv.addService(Service.TelevisionSpeaker);

		this.tvSpeakerService
			.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
			.setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);

		// handle [volume control]
		this.tvSpeakerService.getCharacteristic(Characteristic.VolumeSelector) //increase/decrease volume
			.on('set', this.setVolumeSelector.bind(this));


		// handle [mute control] - not implemented yet
		//this.tvSpeakerService.getCharacteristic(Characteristic.Mute)
		//	.on('get', (callback) => {
		//		callback(null);
		//	})
		//	.on('set', (state, callback) => {
		//		callback(null);
		//	});

		this.tvService.addLinkedService(this.tvSpeakerService);


		/**
		 * Publish as external accessory
		 */
		// get the accesory information and send it to HB
		this.tvInfo
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.SerialNumber, this.serial);


		// CEC stuff
		cecClient.stdout.on('data', data => {
			const traffic = data.toString();
			console.log(traffic);
			if (traffic.indexOf('<< 10:47:43:45:43') !== -1) {
				cecClient.stdin.write('tx 10:47:52:50:69\n'); // Set OSD String to 'RPi'
			}
			if (traffic.indexOf('>> 0f:36') !== -1) {
				tvEvent.emit('POWER_OFF');
			}
			if (traffic.indexOf('>> 01:90:00') !== -1) {
				tvEvent.emit('POWER_ON');
			}
			const match = />> (0f:80:\d0:00|0f:86):(\d)0:00/.exec(traffic);
			if (match) {
				tvEvent.emit('INPUT_SWITCHED', match[2]);
			}
		});


		let justSwitched = false;

		tvEvent.on('POWER_ON', () => {
			if (!justSwitched) {
				this.log.debug('CEC: Power on');
				this.tvService.getCharacteristic(Characteristic.Active).updateValue(true);
				justSwitched = true;
				setTimeout(() => {
					justSwitched = false;
				}, 5000);
			}
		});

		tvEvent.on('POWER_OFF', () => {
			if (!justSwitched) {
				this.log.debug('CEC: Power on');
				this.tvService.getCharacteristic(Characteristic.Active).updateValue(false);
				justSwitched = true;
				setTimeout(() => {
					justSwitched = false;
				}, 5000);
			}
		});

		tvEvent.on('INPUT_SWITCHED', port => {
			this.log.debug(`CEC: Input switched to HDMI${port}`);
			this.tvService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(parseInt(port));
		});


		tvEvent.on('VOLUME_UP', () => {
			if (!justSwitched) {
				this.log.debug('CEC: Volume up');
				this.tvService.getCharacteristic(Characteristic.Volume).updateValue(true);
				justSwitched = true;
				setTimeout(() => {
					justSwitched = false;
				}, 5000);
			}
		});

		tvEvent.on('VOLUME_DOWN', () => {
			if (!justSwitched) {
				this.log.debug('CEC: Volume down');
				this.tvService.getCharacteristic(Characteristic.Volume).updateValue(false);
				justSwitched = true;
				setTimeout(() => {
					justSwitched = false;
				}, 5000);
			}
		});

		// Publish the accessories
		this.api.publishExternalAccessories(PLUGIN_NAME, [this.tv]);


		// Loop the power status
		//this.update();
	}



	getPowerStatus(callback) {
		this.log.info(`Checking TV power status`);
		cecClient.stdin.write('tx 10:8f\n'); // 'pow 0'
		const handler = () => {
			handler.activated = true;
			callback(null, true);
			this.log.info('TV is on');
		};
		tvEvent.once('POWER_ON', handler);
		setTimeout(() => {
			tvEvent.removeListener('POWER_ON', handler);
			if (!handler.activated) {
				callback(null, false);
				this.log.info('TV is off');
			}
		}, 1000);
	}

	setPowerStatus(value, callback) {
		this.log.info(`Turning TV ${value ? 'on' : 'off'}`);
		if (value === this.tvService.getCharacteristic(Characteristic.Active).value) {
			callback();
			this.log.info(`TV is already ${value ? 'on' : 'off'}`);
			return;
		}

		// const handler = () => {
		// 	handler.activated = true;
		// 	callback();
		// 	this.log.info(`TV is turned ${value ? 'on' : 'off'}`);
		// };						
		// tvEvent.once(value ? 'POWER_ON' : 'POWER_OFF', handler);
		// setTimeout(() => {
		// 	tvEvent.removeListener(value ? 'POWER_ON' : 'POWER_OFF', handler);
		// 	if (!handler.activated) {
		// 		callback(`TV is not turning ${value ? 'on' : 'off'}`);
		// 		this.log.info(`TV is not turning ${value ? 'on' : 'off'}`);
		// 	}
		// }, 30000);

		// Send on or off signal
		cecClient.stdin.write(value ? 'tx 10:04\n' : 'tx 10:36\n');
		callback();
	}

	setVolumeSelector(key, callback) {
		this.log.info(`Setting TV volume ${key ? 'up' : 'down'}`);

		// Send volume increase or decrease  signal
		switch (key) {
			case Characteristic.VolumeSelector.INCREMENT: //Volume up
				this.log.info(`TV volume increasing`);
				cecClient.stdin.write('volup 0\n')
				break;
			case Characteristic.VolumeSelector.DECREMENT: //Volume down
				this.log.info(`TV volume decreasing`);
				cecClient.stdin.write('voldown 0\n')
				break;
		}
		callback();
	}

	// setMuteState(state, callback) {
	// 	this.log.info(`Setting TV volume ${state ? 'muted' : 'unmuted'}`);
	//TODO
	// 	callback();
	// }

	setInput(value, callback) {
		this.log.info(`Switching to HDMI${value}`);
		if (!this.tvService.getCharacteristic(Characteristic.Active).value) {
			this.log.info(`TV is off; Retrying to switch input after TV turns on`);
			tvEvent.once('POWER_ON', () => { this.setInput(value, callback); });
			return;
		}
		//const handler = () => {
		// 	handler.activated = true;
		// 	callback();
		// 	this.log.info(`TV is switched to HDMI${value}`);
		// };
		// tvEvent.once('INPUT_SWITCHED', handler);
		// setTimeout(() => {
		// 	tvEvent.removeListener('INPUT_SWITCHED', handler);
		// 	if (!handler.activated) {
		// 		callback(`TV is not switching to HDMI${value}`);
		// 		this.log.info(`TV is not switching to HDMI${value}`);
		// 	}
		// }, 30000);
		cecClient.stdin.write(`tx 1f:82:${value}0:00\n`);
		cecClient.stdin.write(`is\n`);
		callback();
		this.log.info(`Sent CEC command to switch to HDMI${value}`);
	}




	//update() {
	//	var that = this;

	//	// Update TV status every second -> or based on configuration
	//	this.intervalHandler = setInterval(() => {
	//		that.checkPower(function (result) {
	//			if (result == 'error') {
	//				that.connect();
	//			} else {
	//				if (that.awake) that.checkInput();
	//			}
	//		});
	//	}, this.interval);
	//}
}


class CECTVPluginPlatform {
	constructor(log, config, api) {
		if (!config) return;
		if (!config) return;

		this.log = log;
		this.api = api;
		this.config = config;

		if (this.api) this.api.on('didFinishLaunching', this.initAccessory.bind(this));
	}

	initAccessory() {
		// read from config.accessories
		if (this.config.accessories && Array.isArray(this.config.accessories)) {
			for (let accessory of this.config.accessories) {
				if (accessory) new CECTVPlugin(this.log, accessory, this.api);
			}
		} else if (this.config.accessories) {
			this.log.info('Cannot initialize. Type: %s', typeof this.config.accessories);
		}

		if (!this.config.accessories) {
			this.log.info('-------------------------------------------------');
			this.log.info('Please add one or more accessories in your config');
			this.log.info('-------------------------------------------------');
		}
	}
}
