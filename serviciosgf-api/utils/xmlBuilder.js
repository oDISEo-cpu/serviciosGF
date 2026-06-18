/**
 * Constructor XML para parámetros de DHru Fusion
 */
class XmlBuilder {
  static build(params = {}) {
    if (!params || Object.keys(params).length === 0) {
      return '<PARAMETERS></PARAMETERS>';
    }

    let xml = '<PARAMETERS>';
    
    for (const [key, value] of Object.entries(params)) {
      const upperKey = key.toUpperCase();
      const escapedValue = this.escapeXml(String(value));
      xml += `<${upperKey}>${escapedValue}</${upperKey}>`;
    }
    
    xml += '</PARAMETERS>';
    return xml;
  }

  static escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = XmlBuilder;