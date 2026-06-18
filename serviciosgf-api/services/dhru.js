const fetch = require('node-fetch');
const config = require('../config');
const XmlBuilder = require('../utils/xmlBuilder');
const logger = require('../utils/logger');

class DhruService {
  /**
   * Hace la petición a la API de DHru Fusion
   * Replica exactamente lo que hace dhrufusionapi.class.php
   */
  static async callApi(action, parameters = {}) {
    try {
      // Construir XML de parámetros (como lo hace el PHP)
      const parametersXml = XmlBuilder.build(parameters);

      // Body exacto como en el PHP (dhrufusionapi.class.php línea 43-49)
      const bodyParams = new URLSearchParams({
        username: config.dhru.username,
        apiaccesskey: config.dhru.apiAccessKey,
        action: action,
        requestformat: config.dhru.requestFormat,
        parameters: parametersXml
      });

      logger.info(`📡 Llamando a DHru: ${action}`, { parameters });

      // Replica curl_setopt del PHP (líneas 38-50)
      const response = await fetch(config.dhru.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: bodyParams.toString(),
        timeout: 30000
      });

      const text = await response.text();
      logger.debug(`📨 Respuesta DHru (${action}):`, text);

      // Parsear JSON (línea 57 del PHP)
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        logger.error('❌ Error parseando JSON de DHru:', text);
        return {
          ERROR: [{ MESSAGE: 'Invalid response from DHru server' }]
        };
      }

      // Verificar si hay error
      if (result.ERROR) {
        logger.warn(`⚠️ Error DHru en ${action}:`, result.ERROR);
      } else {
        logger.info(`✅ Éxito DHru: ${action}`);
      }

      return result;

    } catch (error) {
      logger.error(`❌ Error conectando con DHru (${action}):`, error.message);
      return {
        ERROR: [{ MESSAGE: `Connection error: ${error.message}` }]
      };
    }
  }

  // ============================================
  // MÉTODOS BASADOS EN LOS ARCHIVOS PHP
  // ============================================

  /**
   * get_account_info.php
   * Obtiene información de la cuenta y saldo
   */
  static async getAccountInfo() {
    return await this.callApi('accountinfo');
  }

  /**
   * get_imeiservice_list.php
   * Lista todos los servicios IMEI disponibles
   */
  static async getImeiServiceList() {
    return await this.callApi('imeiservicelist');
  }

  /**
   * get_single_imei_service_details.php
   * Detalles de un servicio IMEI específico
   */
  static async getImeiServiceDetails(serviceId) {
    if (!serviceId) {
      return { ERROR: [{ MESSAGE: 'Service ID is required' }] };
    }
    return await this.callApi('getimeiservicedetails', { ID: serviceId });
  }

  /**
   * place_imei_order.php
   * Crea un nuevo pedido IMEI
   */
  static async placeImeiOrder(orderData) {
    const { 
      imei, 
      serviceId, 
      modelId, 
      providerId, 
      mep, 
      pin, 
      kbh, 
      prd, 
      type, 
      reference, 
      locks 
    } = orderData;

    if (!imei || !serviceId) {
      return { ERROR: [{ MESSAGE: 'IMEI and Service ID are required' }] };
    }

    const params = {
      IMEI: imei,
      ID: serviceId
    };

    // Parámetros opcionales (como en place_imei_order.php líneas 17-24)
    if (modelId) params.MODELID = modelId;
    if (providerId) params.PROVIDERID = providerId;
    if (mep) params.MEP = mep;
    if (pin) params.PIN = pin;
    if (kbh) params.KBH = kbh;
    if (prd) params.PRD = prd;
    if (type) params.TYPE = type;
    if (reference) params.REFERENCE = reference;
    if (locks) params.LOCKS = locks;

    return await this.callApi('placeimeiorder', params);
  }

  /**
   * get_imei_orders_details.php
   * Obtiene los detalles de un pedido IMEI
   */
  static async getImeiOrderDetails(referenceId) {
    if (!referenceId) {
      return { ERROR: [{ MESSAGE: 'Reference ID is required' }] };
    }
    return await this.callApi('getimeiorder', { ID: referenceId });
  }

  /**
   * get_fileservice_list.php
   * Lista de servicios de archivo
   */
  static async getFileServiceList() {
    return await this.callApi('fileservicelist');
  }

  /**
   * place_file_order.php
   * Crea un pedido de archivo
   */
  static async placeFileOrder(serviceId, fileName, fileData) {
    if (!serviceId || !fileName || !fileData) {
      return { ERROR: [{ MESSAGE: 'Service ID, filename and filedata are required' }] };
    }
    return await this.callApi('placefileorder', {
      ID: serviceId,
      FILENAME: fileName,
      FILEDATA: fileData
    });
  }

  /**
   * get_file_order_details.php
   * Detalles de un pedido de archivo
   */
  static async getFileOrderDetails(orderId) {
    if (!orderId) {
      return { ERROR: [{ MESSAGE: 'Order ID is required' }] };
    }
    return await this.callApi('getfileorder', { ID: orderId });
  }

  /**
   * get_provider_list.php
   * Lista de proveedores de un servicio
   */
  static async getProviderList(serviceId) {
    if (!serviceId) {
      return { ERROR: [{ MESSAGE: 'Service ID is required' }] };
    }
    return await this.callApi('providerlist', { ID: serviceId });
  }

  /**
   * get_model_list.php
   * Lista de modelos de un servicio
   */
  static async getModelList(serviceId) {
    if (!serviceId) {
      return { ERROR: [{ MESSAGE: 'Service ID is required' }] };
    }
    return await this.callApi('modellist', { ID: serviceId });
  }

  /**
   * get_mep_list.php
   * Lista de MEP
   */
  static async getMepList() {
    return await this.callApi('meplist');
  }
}

module.exports = DhruService;