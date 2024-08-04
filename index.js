const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();

const app = express();
app.use(bodyParser.json());

const s3 = new AWS.S3({
  endpoint: 'http://minio:9000',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const bucketName = 'my-bucket';

// Ensure the bucket exists
const ensureBucketExists = async () => {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
  } catch (err) {
    if (err.code === 'NotFound') {
      await s3.createBucket({ Bucket: bucketName }).promise();
    } else {
      throw err;
    }
  }
};

// POST endpoint to upload files
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const params = {
    Bucket: bucketName,
    Key: file.originalname,
    Body: file.buffer,
  };

  try {
    await ensureBucketExists();
    const data = await s3.upload(params).promise();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

// GET endpoint to retrieve files
app.get('/file/:filename', async (req, res) => {
  const { filename } = req.params;

  const params = {
    Bucket: bucketName,
    Key: filename,
  };

  try {
    const data = await s3.getObject(params).promise();
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', data.ContentType);
    res.send(data.Body);
  } catch (err) {
    if (err.code === 'NoSuchKey') {
      res.status(404).send('File not found.');
    } else {
      res.status(500).send(err);
    }
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
