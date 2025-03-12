import express from 'express';
import https from 'https';
import twilio from 'twilio';
import 'dotenv/config'

const app = express();
const port = 3000;

// Configuration
const ULTRAVOX_API_KEY = "81mYuyOH.nYoDrwpOIvxdxEpiCLDEHx2XzD3O8mGu"
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

// Ultravox configuration
const SYSTEM_PROMPT = 'Your name is Anjali. You are an employee of Jio in India. You are receiving a phone call. Ask them their name and see how they are doing. You have to answer all the questions they ask you in a patient and friendly manner. You also know about Jio and its services. Keep your answers and conversations crisp, concise and to the point.You are speaking with the user over voice, so do not use lists, emojis or other things. Additionally, do not use action verbs or stage directions in your replies. Find order info by calling a tool OrderLookup. Find customer info by calling a tool CustomerLookup. Find information on Jio FAQs by calling a tool queryCorpus. You can also ask the user to repeat or clarify their question if you do not understand it.';

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'Anjali-Hindi-Urdu',
    temperature: 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    medium: { "twilio": {} }
    // ,
    // selectedTools:[
    //     { toolName: "CustomerLookup" },
    //     { toolName: "OrderLookup" },
    //     { toolName: "queryCorpus" }
    //  ]
};

// Create Ultravox call and get join URL
async function createUltravoxCall() {
    const request = https.request(ULTRAVOX_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ULTRAVOX_API_KEY
        }
    });

    return new Promise((resolve, reject) => {
        let data = '';

        request.on('response', (response) => {
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(JSON.parse(data)));
        });

        request.on('error', reject);
        request.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        request.end();
    });
}

// Handle incoming calls
app.post('/incoming', async (req, res) => {
    try {
        console.log('Incoming call received');
        const response = await createUltravoxCall();
        const twiml = new twilio.twiml.VoiceResponse();
        const connect = twiml.connect();
        connect.stream({
            url: response.joinUrl,
            name: 'ultravox'
        });

        const twimlString = twiml.toString();
        res.type('text/xml');
        res.send(twimlString);

    } catch (error) {
        console.error('Error handling incoming call:', error);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error connecting your call.');
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});