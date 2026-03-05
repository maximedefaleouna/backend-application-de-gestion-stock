/**
 * Formatteur de réponse API standardisé
 */
class ApiResponse {
  /**
   * Réponse succès standardisée
   */
  static success(res, data, message = 'Opération réussie', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse erreur standardisée
   */
  static error(res, message, statusCode = 500, details = null) {
    const response = {
      success: false,
      message,
      error: this.getErrorMessage(statusCode),
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Message d'erreur selon le code HTTP
   */
  static getErrorMessage(statusCode) {
    const messages = {
      400: 'Requête invalide',
      401: 'Non authentifié',
      403: 'Accès refusé',
      404: 'Ressource non trouvée',
      409: 'Conflit de données',
      500: 'Erreur serveur interne'
    };
    return messages[statusCode] || 'Erreur inconnue';
  }

  /**
   * Réponse pour création (201)
   */
  static created(res, data, message = 'Ressource créée avec succès') {
    return this.success(res, data, message, 201);
  }

  /**
   * Réponse pour suppression (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Réponse paginée
   */
  static paginated(res, data, pagination, message = 'Données récupérées avec succès') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;
