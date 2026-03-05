const z = require('zod');

/**
 * Middleware de validation avec Zod
 * Vérifie les données selon un schéma fourni
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      
      // Attacher les données validées à la requête
      req.validatedData = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Formater les erreurs de validation - Compatible Zod v3 et v4
        let errors = [];
        
        // Zod v4 utilise error.issues au lieu de error.errors
        const issues = error.issues || error.errors || [];
        
        if (Array.isArray(issues)) {
          errors = issues.map(issue => ({
            field: issue.path?.join('.') || 'unknown',
            message: issue.message,
            code: issue.code
          }));
        } else {
          // Fallback pour autres formats
          errors = [{ 
            field: 'unknown', 
            message: error.message || 'Validation failed', 
            code: 'invalid' 
          }];
        }

        return res.status(400).json({
          success: false,
          message: 'Validation échouée',
          error: 'Données invalides',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    }
  };
}

module.exports = validate;
