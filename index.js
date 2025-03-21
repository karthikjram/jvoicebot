import express from 'express';
import https from 'https';
import twilio from 'twilio';
import 'dotenv/config'

const app = express();
const port = 3100;

// Configuration
const ULTRAVOX_API_KEY = "81mYuyOH.nYoDrwpOIvxdxEpiCLDEHx2XzD3O8mGu"
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

// Ultravox configuration
const SYSTEM_PROMPT = 'Your name is Anjali. You are an employee of Jio in India. You are receiving a phone call. Ask them their name and see how they are doing. You have to answer all the questions they ask you in a patient and friendly manner. Keep your answers and conversations crisp, concise and to the point. If the caller explicitly asks to speak with a human agent or insists on escalating, politely acknowledge their request, inform them that you will immediately transfer their call to a human representative, and initiate the transfer process promptly without further questioning. You know about Jio and its services. Keep your answers and conversations crisp, concise and to the point.You are speaking with the user over voice, so do not use lists, emojis or other things. Additionally, do not use action verbs or stage directions in your replies. Find order info by calling a tool orderLookup. Find customer info by calling a tool customerLookup. Find information on Jio services knowledge and FAQs by calling a tool queryCorpus. Do not tell about which tools you are using internally when talking to a customer.';

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'Anjali-Hindi-Urdu',
    temperature: 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    medium: { "twilio": {} },
    recordingEnabled: true,
    selectedTools: [
        {
          toolName: "queryCorpus", 
          parameterOverrides: {
            corpus_id: "8d3bbd9a-0dc6-414e-9ee5-7a4724757d1c",
            max_results: 5
          }
        },
        {
          toolName: "customerLookup"
        },
        {
          toolName: "orderLookup"
        },
        { 
          toolName: "hangUp" 
        }
      ],
      inactivityMessages: [
        {
          duration: "5s",
          message: "Are you still there?",
          endBehavior: "END_BEHAVIOR_UNSPECIFIED"
        },
        {
          duration: "30s",
          message: "If there's nothing else, I will end the call now.",
          endBehavior: "END_BEHAVIOR_HANG_UP_SOFT"
        }
    ]
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
            //response.on('end', () => resolve(JSON.parse(data)));

            response.on('end', () => {
                const responseData = JSON.parse(data);
                // Store the callId here
                const callId = responseData.callId;
                // You can save this callId to a variable, database, or wherever is appropriate for your application
                console.log('Call ID:', callId);
                console.log('Call Details:', responseData);
 
                resolve(responseData);
            });

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

        // Extract caller's phone number
        //const callerNumber = req.body.From;
        //console.log('Incoming call req object from:', req);

        const response = await createUltravoxCall();
        const twiml = new twilio.twiml.VoiceResponse();
        const connect = twiml.connect();
        connect.stream({
            url: response.joinUrl,
            name: 'ultravox'
        });

        const twimlString = twiml.toString();
        console.log('twimlString', twimlString);

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