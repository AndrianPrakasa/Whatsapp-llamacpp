const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const axios = require('axios');

const client = new Client({
  puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.initialize();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

let chatHistory = [];

client.on('message', async (message) => {
  if (message.body.startsWith('!')) {
    const command = message.body.substring(1); // Extract the command after '!'
    const sanitizedCommand = command.replace(/"/g, '\\"'); // Escape quotes to avoid breaking JSON

    // Add the new message to the chat history
    chatHistory.push({ role: 'user', content: sanitizedCommand });

    try {
      // Send the request to the llama-cpp server
      const response = await axios.post('http://localhost:8080/chat/completions', {
        messages: chatHistory,
        //n_predict: 512,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Log the full response from the server
      console.log('Server response:', JSON.stringify(response.data, null, 2));

      // Extract and clean the content
      let content = response.data.choices[0].message.content.trim();

      if (content) {
        // Log the cleaned content
        console.log('Cleaned content:', content);

        // Add the response to the chat history and reply to the message
        chatHistory.push({ role: 'assistant', content: content });
        message.reply(content);
      } else {
        console.log('No content returned from the server.');
        message.reply('No content generated. Please try again.');
      }
    } catch (error) {
      // Log detailed error information
      console.error('Error during axios request:', error.message);
      if (error.response) {
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
      }
      message.reply('Something went wrong. Please try again later.');
    }
  }
});
