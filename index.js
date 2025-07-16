const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const app = express();
app.use(express.json());

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({ model: 'models/gemini-2.0-flash' });

const upload = multer({ dest: 'upload/' });

const PORT = 3000;
app.listen(PORT, () => {
    console.log('Gemini API server is running at http://localhost:${PORT}');
});

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ output: response.text() });
    }   catch (error) {
        res.status(500).json({ error: error.message });
    }

});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
function imageToGenerativePart(filePath) {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    return base64Image;
}
    const prompt = req.body.prompt || 'Describe the image';
    const temperature = req.body.temperature || 0.7; // default to 0.7 if not provided

    try {
        const image = imageToGenerativePart(req.file.path);
        // Pass temperature as an argument if supported
        const result = await model.generateContent([prompt, image], { temperature });
        const response = await result.response;

        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path; 
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const documentPart = {
          inlineData: { data: base64Data, mimeType }
        };

        const result = await model.generateContent(['Analyze this document:', documentPart]);
        const response = await result.response;
        res.json({ output: response.text() });
    }   catch (error) {
        res.status(500).json({ error: error.message });
    }   finally {
        fs.unlinkSync(filePath);
    }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            data: base64Audio,
            mimeType: req.file.mimetype
        }
    };

    try {
        const result = await model.generateContent([
            'Transcribe or analyze the following audio:', audioPart
        ]);
        const response = await result.response;
        res.json({ output: response.text() });
    }   catch (error) {
        res.status(500).json({ error: error.message });
    }   finally {
        fs.unlinkSync(req.file.path);
    }
});