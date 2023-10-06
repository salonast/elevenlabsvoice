require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Add this to your environment variables
const YOUR_VF_11_API_KEY = process.env.YOUR_VF_11_API_KEY;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error(error);
    return res.status(400).send({ message: 'Malformed JSON in payload' });
  }
  next();
});

// API Key Middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== YOUR_VF_11_API_KEY) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
  next();
});

app.post('/synthesize', async (req, res) => {
  let text = req.body.text || null

  // Updated this based on Elias feedback
  // As this change will allow the user to pass 0 as a value, if no text is set in the text variable,
  // text will be 0 and the condition will be false so "0" will be used to do TTS.

  // Previous condition
  // if (text === undefined || text === null || text === '' || text == 0) {

  if (!text) {
    res.status(400).send({ error: 'Text is required.' })
    return
  }

  // Remove double quotes from text
  text = text.replace(/"/g, '')

  const voice =
    req.body.voice == 0
      ? 'U0Ijd7wTncAfWZ7cof7f'
      : req.body.voice || 'U0Ijd7wTncAfWZ7cof7f'

  const model = req.body.model || 'eleven_multilingual_v2'

  const voice_settings =
    req.body.voice_settings == 0
      ? {
          stability: 0.50,
          similarity_boost: 0.75,
        }
      : req.body.voice_settings || {
          stability: 0.75,
          similarity_boost: 0.75,
        }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        text: text.replace(/"/g, '\\"'), // escape inner double quotes ,
        voice_settings: voice_settings,
        model_id: model,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          accept: 'audio/mpeg',
          'xi-api-key': `${process.env.ELEVENLABS_API_KEY}`,
        },
        responseType: 'arraybuffer',
      }
    )

    const audioBuffer = Buffer.from(response.data, 'binary')
    const base64Audio = audioBuffer.toString('base64')
    const audioDataURI = `data:audio/mpeg;base64,${base64Audio}`
    res.send({ audioDataURI })
  } catch (error) {
    console.error(error)
    res.status(500).send('Error occurred while processing the request.')
  }
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
