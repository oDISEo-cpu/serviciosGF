const express = require('express');
const router = express.Router();
const DhruService = require('../services/dhru');
const authMiddleware = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// ============================================
// 🏠 HEALTH CHECK
// ============================================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ServiciosGF API',
    version: '1.0.0'
  });
});

// ============================================
// 💰 CUENTA Y SALDO (get_account_info.php)
// ============================================
router.post('/balance', async (req, res) => {
  try {
    const result = await DhruService.getAccountInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📋 SERVICIOS IMEI (get_imeiservice_list.php)
// ============================================
router.post('/services', async (req, res) => {
  try {
    const result = await DhruService.getImeiServiceList();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 🔍 DETALLES SERVICIO (get_single_imei_service_details.php)
// ============================================
router.post('/service-details', async (req, res) => {
  try {
    const { serviceId } = req.body;
    const result = await DhruService.getImeiServiceDetails(serviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📦 PEDIDOS IMEI (place_imei_order.php)
// ============================================
router.post('/order', async (req, res) => {
  try {
    const result = await DhruService.placeImeiOrder(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📊 ESTADO PEDIDO (get_imei_orders_details.php)
// ============================================
router.post('/order-status', async (req, res) => {
  try {
    const { referenceId } = req.body;
    const result = await DhruService.getImeiOrderDetails(referenceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📁 SERVICIOS ARCHIVO (get_fileservice_list.php)
// ============================================
router.post('/file-services', async (req, res) => {
  try {
    const result = await DhruService.getFileServiceList();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📄 PEDIDO ARCHIVO (place_file_order.php)
// ============================================
router.post('/file-order', async (req, res) => {
  try {
    const { serviceId, fileName, fileData } = req.body;
    const result = await DhruService.placeFileOrder(serviceId, fileName, fileData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📋 ESTADO PEDIDO ARCHIVO (get_file_order_details.php)
// ============================================
router.post('/file-order-status', async (req, res) => {
  try {
    const { orderId } = req.body;
    const result = await DhruService.getFileOrderDetails(orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 🏢 PROVEEDORES (get_provider_list.php)
// ============================================
router.post('/providers', async (req, res) => {
  try {
    const { serviceId } = req.body;
    const result = await DhruService.getProviderList(serviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 📱 MODELOS (get_model_list.php)
// ============================================
router.post('/models', async (req, res) => {
  try {
    const { serviceId } = req.body;
    const result = await DhruService.getModelList(serviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

// ============================================
// 🔑 MEP LIST (get_mep_list.php)
// ============================================
router.post('/mep-list', async (req, res) => {
  try {
    const result = await DhruService.getMepList();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ERROR: [{ MESSAGE: error.message }] });
  }
});

module.exports = router;