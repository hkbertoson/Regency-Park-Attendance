const aws = require('aws-sdk');
const date = require('date-and-time');
const axios = require('axios');
const dotenv = require('dotenv');
const ses = new aws.SES({region: 'us-east-1'});
const wednesdayNightTimes = ['09:00', '23:59'];

exports.handler = async () => {
	dotenv.config();
	const username = process.env.USERNAME;
	const password = process.env.PASSWORD;

	const now = new Date();
	const yesterday = date.addDays(now, -1);
	const formattedDate = date.format(yesterday, 'YYYY-MM-DD');
	const emailDate = date.format(yesterday, 'MM-DD-YYYY');

	const timeArray = [];

	let kidCount = 0;
	let volunteerCount = 0;

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
				attributes: {created_at, kind},
			} = item);

			created_at = new Date(created_at);
			created_at = date.format(created_at, 'hh:mm', true);

			switch (kind) {
				case 'Regular':
					kidCount += 1;
					break;
				case 'Volunteer':
					volunteerCount += 1;
					break;
				case 'Guest':
					kidCount += 1;
					break;
				default:
					break;
			}
			timeArray.push(created_at);
		});

		const wednesdayNightTime = timeArray.filter(checkWednesdayNightTime);

		const emailData = `
            <table style="border:1px solid #C0C0C0;  border-collapse: collapse;">
        <caption>Attendance Report for Wednesday</caption>
        <thead>
            <tr>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0; ">Kids</th>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0;">Volunteers</th>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0;">Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #C0C0C0;">${kidCount}</td>
                <td style="border: 1px solid #C0C0C0;">${volunteerCount}</td>
                <td style="border: 1px solid #C0C0C0;">${wednesdayNightTime.length}</td>
            </tr>
        </tbody>
    </table>`;
		const params = {
			Destination: {
				ToAddresses: [process.env.FIRST, process.env.SECOND],
			},
			Message: {
				Body: {
					Html: {Data: `${emailData}`},
				},
				Subject: {Data: `Attendance Report for ${emailDate}`},
			},
			Source: process.env.FROM_ADDRESS,
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

function checkWednesdayNightTime(value) {
	return value >= wednesdayNightTimes[0] && value <= wednesdayNightTimes[1];
}
