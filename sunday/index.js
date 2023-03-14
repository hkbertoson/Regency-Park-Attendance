const aws = require('aws-sdk');
const date = require('date-and-time');
const axios = require('axios');
const ses = new aws.SES({region: 'us-east-1'});
const sundaySchoolTimes = ['01:00', '02:30'];
const mainChurchTimes = ['02:31', '04:00'];

require('dotenv').config();

const handler = async () => {
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

		const sundayCountTime = timeArray.filter(checkSundaySchoolTime);
		const mainChurchCountTime = timeArray.filter(checkMainChurchTime);
		const totalCount = sundayCountTime.length + mainChurchCountTime.length;

		const emailData = `
            <table style="border:1px solid #C0C0C0;  border-collapse: collapse;">
        <caption>Attendance Report for Sunday</caption>
        <thead>
            <tr>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0;">Sunday School Kids</th>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0;">Sunday School Volunteers</th>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0;">Service Kids</th>
                <th style="border: 1px solid #C0C0C0; background: #F0F0F0;">Service Volunteers</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #C0C0C0;">${sundayCountTime.length}</td>
                <td style="border: 1px solid #C0C0C0;">${volunteerCount}</td>
                <td style="border: 1px solid #C0C0C0;">${totalCount}</td>
                <td style="border: 1px solid #C0C0C0;">${volunteerCount}</td>
            </tr>
        </tbody>
    </table>
    `;

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

handler();

const checkSundaySchoolTime = (value) => {
	return value >= sundaySchoolTimes[0] && value <= sundaySchoolTimes[1];
};
const checkMainChurchTime = (value) => {
	return value >= mainChurchTimes[0] && value <= mainChurchTimes[1];
};
