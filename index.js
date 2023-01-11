const aws = require('aws-sdk');
const ses = new aws.SES({region: 'us-east-1'});
const sundaySchoolTimes = ['08:30', '09:30'];
const wednesdayNightTimes = ['03:30', '06:45'];
const mainChurchTimes = ['09:31', '10:30'];

exports.handler = async () => {
	const dotenv = require('dotenv');
	const axios = require('axios');
	dotenv.config();
	const username = process.env.USERNAME;
	const password = process.env.PASSWORD;
	const fromAddress = process.env.FROM_ADDRESS;
	const toAddress = process.env.TO_ADDRESS;

	const date = new Date();
	date.setDate(date.getDate() - 1);

	const locationArray = [];
	const timeArray = [];

	const formattedDateForApiCall = date.toISOString().slice(0, 10);

	const formattedDate = date.toLocaleDateString();

	const url = `https://api.planningcenteronline.com/check-ins/v2/check_ins?include=locations&where[created_at]=${formattedDateForApiCall}`;

	const checkRolandCenter = (ID) => {
		return ID == '947126';
	};

	const checkKinderChurch = (ID) => {
		return ID == '947241';
	};

	const checkNursery = (ID) => {
		return ID == '947131';
	};

	try {
		const response = await axios.get(url, {
			auth: {
				username: username,
				password: password,
			},
		});
		const data = response.data.data;

		data.map((item) => {
			({
				relationships: {
					locations: {
						data: [{id: location_id}],
					},
				},
				attributes: {created_at},
			} = item);

			created_at = new Date(created_at);
			created_at = created_at.toLocaleTimeString([], {
				hour12: false,
			});
			timeArray.push(created_at);
			locationArray.push(location_id);
		});

		const rolandCenter = locationArray.filter(checkRolandCenter);
		const kinderChurch = locationArray.filter(checkKinderChurch);
		const nursery = locationArray.filter(checkNursery);
		const sundayCountTime = timeArray.filter(checkSundaySchoolTime);
		const mainChurchCountTime = timeArray.filter(checkMainChurchTime);
		const wednesdayNightTime = timeArray.filter(checkWednesdayNightTime);

		const formattedString = `
		Total Attendance for ${formattedDate} 
		Roland Center: ${rolandCenter.length}
		Kinder Church: ${kinderChurch.length}
		Nursery: ${nursery.length} 
		Total Count for Sunday School: ${sundayCountTime.length} 
		Total Count for 10:10 Service: ${mainChurchCountTime.length}
		Total Count for Wednesday night Service: ${wednesdayNightTime.length}`;

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

function checkSundaySchoolTime(value) {
	return value >= sundaySchoolTimes[0] && value <= sundaySchoolTimes[1];
}

function checkMainChurchTime(value) {
	return value >= mainChurchTimes[0] && value <= mainChurchTimes[1];
}

function checkWednesdayNightTime(value) {
	return value >= wednesdayNightTimes[0] && value <= wednesdayNightTimes[1];
}
