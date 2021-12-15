const {Extension, PLATFORMS, INPUT_METHOD} = require("deckboard-kit");
const axios = require("axios");
const WebSocket = require("ws");
const jsonic = require("jsonic");

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
				value: "",
			},
			memeboxPort: {
				type: "text",
				name: "Memebox port",
				descriptions: "Example: 6363",
				value: "",
			},
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
						label: "Action to trigger",
						ref: "mediaID",
						type: "input:autocomplete",
					},
					{
						label: "Arguments (Optional)",
						value: "test123",
						ref: "memeboxArgs",
						type: INPUT_METHOD.INPUT_TEXTAREA,
					},
				],
			},
		];

		this.initExtension();
	}

	// Executes when the extensions loaded every time the app start.
	initExtension() {
	}

	get selections() {
		return [
			{
				header: this.name,
			}, ...this.inputs,
		];
	}

	getAutocompleteOptions(ref) {
		switch (ref) {
			case "mediaID":
				return this.getMemeboxAction();
			default:
				return [];
		}

	}

	async getMemeboxAction() {
		try {
			const {memeboxAddress, memeboxPort} = this.configs;

			if (!memeboxAddress.value) {
				throw new Error("Missing Memebox configuration. Check your extension configuration screen.");
			}

			const result = await axios.get(`http://${memeboxAddress.value}:${memeboxPort.value}/api/clips`, {
				headers: {
					"Accept": "application/json",
				},
			});

			const data = result.data;
			//if (!data) return [];

			return data.map((action) => {
				const actionType = this._convertActionTypeToLabel(action.type);
				return {
					value: action.id,
					label: `${actionType} - ${action.name}`,
				};
			});
		} catch (e) {
			return {
				value: "-999",
				label: e.message,
			};
		}
	}

	triggerMemeboxAction(mediaID, memeboxArgs) {
		let variables;

		try {
			variables = memeboxArgs ? jsonic(memeboxArgs) : null;
		} catch (_) {
			variables = null;
		}

		const triggerObj = {
			id: mediaID,
			repeatX: 0,
			repeatSecond: 0,
			overrides: {
				action: {
					variables
				}
			}
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
				const {mediaID, memeboxArgs} = params;
				if (this.memeboxWS == null) {
					const {memeboxAddress, memeboxPort} = this.configs;
					this.memeboxWS = new WebSocket(`ws://${memeboxAddress.value}:${memeboxPort.value}`);
					this.memeboxWS.on("open", () => {
						this.triggerMemeboxAction(mediaID, memeboxArgs);
					});
				} else {
					this.triggerMemeboxAction(mediaID, memeboxArgs);
				}
				break;
		}
	};

	_convertActionTypeToLabel(actionType) {
		switch (parseInt(actionType)) {
			case -1:
				return "Invalid";
			case 0:
				return "Picture";
			case 1:
				return "Audio";
			case 2:
				return "Video";
			case 3:
				return "IFrame";
			case 4:
				return "Widget";
			case 5:
				return "Script";
			case 98:
				return "PermanentScript";
			case 99:
				return "WidgetTemplate";
			case 100:
				return "Meta";
		}
	}
}

module.exports = (sendData) => new MemeBox(sendData);
