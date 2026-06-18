exports.handler = async (event, context) => {
  try {
    const bodyParams = new URLSearchParams({
      username: 'Esojlin',
      apiaccesskey: 'IZQ-MNQ-61K-6SD-FFQ-BQG-5UP-XU9',
      action: 'accountinfo',
      requestformat: 'JSON',
      parameters: '<PARAMETERS></PARAMETERS>'
    });

    const response = await fetch('https://jonartgsm.com/api/index.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: bodyParams.toString()
    });

    const text = await response.text();
    console.log('Balance response:', text);
    
    const result = JSON.parse(text);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};