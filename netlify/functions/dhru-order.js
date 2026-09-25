exports.handler = async (event, context) => {
  try {
    const { imei, serviceId } = JSON.parse(event.body);
    
    // Construir XML con los parámetros (como lo hace el PHP)
    const parametersXml = `<PARAMETERS><IMEI>${imei}</IMEI><ID>${serviceId}</ID></PARAMETERS>`;
    
    const bodyParams = new URLSearchParams({
      username: 'TU_USUARIO_DHRU',
      apiaccesskey: 'TU_API_KEY_DHRU_AQUI',
      action: 'placeimeiorder',
      requestformat: 'JSON',
      parameters: parametersXml
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
    console.log('Order response:', text);
    
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