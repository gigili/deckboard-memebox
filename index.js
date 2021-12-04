const {Extension, log, INPUT_METHOD, PLATFORMS} = require("deckboard-kit");
const axios = require("axios");
const WebSocket = require("ws");

let memeboxWS = null;

class MemeBox extends Extension {
	constructor(props) {
		super(props);

		this.setValue = props.setValue;
		this.name = "MemeBox";
		this.platforms = [PLATFORMS.WINDOWS, PLATFORMS.MAC, PLATFORMS.LINUX];

		this.memeboxWS = null;

		this.configs = {
			memeboxAddress: {
				type: "text",
				name: "Memebox address",
				descriptions: "Example: 127.0.0.1",
				value: ""
			},
			memeboxPort: {
				type: "text",
				name: "Memebox port",
				descriptions: "Example: 6363",
				value: ""
			}
		};

		this.inputs = [
			{
				label: "Select media",
				value: "memebox-trigger",
				icon: "bolt",
				fontIcon: "fas",
				color: "#6441a4",
				input: [
					{
						label: "Media to trigger",
						ref: "mediaID",
						type: "input:autocomplete"
					}
				]
			}
		];

		this.initExtension();
	}

	// Executes when the extensions loaded every time the app start.
	initExtension() {
	}

	get selections() {
		return [
			{
				header: this.name
			}, ...this.inputs
		];
	}

	getAutocompleteOptions(ref) {
		switch (ref) {
			case "mediaID":
				return this.getMemeboxMedia();
			default:
				return [];
		}

	}

	async getMemeboxMedia() {
		const {memeboxAddress, memeboxPort} = this.configs;
		try {
			const result = await axios.get(`http://${memeboxAddress.value}:${memeboxPort.value}/api/clips`, {
				headers: {
					"Accept": "application/json"
				}
			});
			const data = result.data;

			return data.map((media) => {
				return {
					value: media.id,
					label: media.name
				};
			});
		} catch (e) {
			return {
				value: "-999",
				label: e.message
			};
		}
	}

	triggerMemeboxMedia(mediaID) {
		const triggerObj = {
			id: mediaID,
			repeatX: 0,
			repeatSecond: 0,
		};
		this.sendMemeboxTrigger(triggerObj);
	}

	sendMemeboxTrigger(triggerObj) {
		if (this.memeboxWS !== null) {
			this.memeboxWS.send(`TRIGGER_CLIP=${JSON.stringify(triggerObj)}`);
		}
	}


	execute(action, params) {
		switch (action) {
			case "memebox-trigger":
				const {mediaID} = params;
				if (this.memeboxWS == null) {
					const {memeboxAddress, memeboxPort} = this.configs;
					this.memeboxWS = new WebSocket(`ws://${memeboxAddress.value}:${memeboxPort.value}`);
					this.memeboxWS.on("open", () => {
						this.triggerMemeboxMedia(mediaID);
					});
				} else {
					this.triggerMemeboxMedia(mediaID);
				}
				break;
		}
	};
}

module.exports = (sendData) => new MemeBox(sendData);
