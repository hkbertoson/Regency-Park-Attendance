const aws = require('aws-sdk');
const ses = new aws.SES({region: 'us-east-1'});

exports.handler = async () => {
	const dotenv = require('dotenv');
	const axios = require('axios');
	dotenv.config();
	const username = process.env.USERNAME;
	const password = process.env.PASSWORD;
	const fromAddress = process.env.FROM_ADDRESS;
	const toAddress = process.env.TO_ADDRESS;

	const date = new Date();
	const locationArray = [];
	let relationships;
	const formattedDateForApiCall = date.toISOString().slice(0, 10);
	let month = ('0' + (date.getMonth() + 1)).slice(-2);
	let day = ('0' + date.getDate()).slice(-2);
	let year = date.getFullYear();
	const formattedDate = `${month}/${day}/${year}`;
	const url = `https://api.planningcenteronline.com/check-ins/v2/check_ins?include=locations&where[created_at]=${formattedDateForApiCall}`;

	try {
		const res = await axios.get(url, {
			auth: {
				username: username,
				password: password,
			},
		});
		const data = res.data.data;

		data.map((item) => {
			relationships = item.relationships.locations.data;
			relationships.map((locationID) => {
				locationArray.push(locationID.id);
			});
		});

		const checkRolandCenter = (ID) => {
			return ID == '947126';
		};
		const checkKinderChurch = (ID) => {
			return ID == '947241';
		};

		const checkNursery = (ID) => {
			return ID == '947131';
		};
		const rolandCenter = locationArray.filter(checkRolandCenter);
		const kinderChurch = locationArray.filter(checkKinderChurch);
		const nursery = locationArray.filter(checkNursery);

		const formattedString = `Total Attendance for ${formattedDateForApiCall} is Roland Center: ${rolandCenter.length} , Kinder Church: ${kinderChurch.length} , Nursery: ${nursery.length}`;

		const params = {
			Destination: {
				ToAddresses: [toAddress],
			},
			Message: {
				Body: {
					Text: {Data: `${formattedString}`},
				},
				Subject: {Data: `Attendance Report for ${formattedDate}`},
			},
			Source: fromAddress,
		};
		return ses.sendEmail(params).promise();
	} catch (error) {
		console.log(error);
		return {
			statusCode: 500,
			body: JSON.stringify({error}),
		};
	}
};
