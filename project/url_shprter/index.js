require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


const urlDatabase = [];

function validateUrl(urlToValidate) {
  const regex = /^(http|https):\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/;
  return regex.test(urlToValidate);
}

app.post('/api/shorturl', (req, res) => {
  const original_url = req.body.url;
  const isValidUrl = validateUrl(original_url);

  if (!isValidUrl) {
    return res.json({ error: 'Invalid url' });
  }

  const parsedUrl = url.parse(original_url);

  dns.lookup(parsedUrl.hostname, (err) => {
    if (err) {
      return res.json({ error: 'Invalid url' });
    }

    const foundIndex = urlDatabase.findIndex(entry => entry.original_url === original_url);
    if (foundIndex === -1) {
      const short_url = urlDatabase.length + 1;
      urlDatabase.push({ original_url, short_url });
      return res.json({ original_url, short_url });
    } else {
      return res.json({ original_url, short_url: urlDatabase[foundIndex].short_url });
    }
  });
});

app.get('/api/shorturl/:short_url', (req, res) => {
  const short_url = parseInt(req.params.short_url);
  const urlEntry = urlDatabase.find(entry => entry.short_url === short_url);

  if (urlEntry) {
    res.redirect(urlEntry.original_url);
  } else {
    res.json({ error: 'No  short URL' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
