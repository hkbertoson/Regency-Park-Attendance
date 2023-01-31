const aws = require('aws-sdk');
const date = require('date-and-time');
const axios = require('axios');
const dotenv = require('dotenv');
const ses = new aws.SES({region: 'us-east-1'});
const sundaySchoolTimes = ['02:30', '03:30'];
const mainChurchTimes = ['03:31', '04:30'];
const wednesdayNightTimes = ['09:31', '10:30'];

exports.handler = async () => {
	dotenv.config();
	const username = process.env.USERNAME;
	const password = process.env.PASSWORD;

	const now = new Date();
	const yesterday = date.addDays(now, -1);
	const formattedDate = date.format(yesterday, 'YYYY-MM-DD');

	const locationArray = [];
	const timeArray = [];

	const url = `https://api.planningcenteronline.com/check-ins/v2/check_ins?include=locations&where[created_at]=${formattedDate}`;

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
			created_at = date.format(created_at, 'hh:mm', true);
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
				ToAddresses: [
					'hunterkylebertoson@gmail.com',
					'brianna@regencypark.org',
				],
			},
			Message: {
				Body: {
					Text: {Data: `${formattedString}`},
				},
				Subject: {Data: `Attendance Report for ${formattedDate}`},
			},
			Source: 'hunterkylebertoson@gmail.com',
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

function checkRolandCenter(ID) {
	return ID == '947126';
}
function checkKinderChurch(ID) {
	return ID == '947241';
}
function checkNursery(ID) {
	return ID == '947131';
}
function checkSundaySchoolTime(value) {
	return value >= sundaySchoolTimes[0] && value <= sundaySchoolTimes[1];
}
function checkMainChurchTime(value) {
	return value >= mainChurchTimes[0] && value <= mainChurchTimes[1];
}
function checkWednesdayNightTime(value) {
	return value >= wednesdayNightTimes[0] && value <= wednesdayNightTimes[1];
}
