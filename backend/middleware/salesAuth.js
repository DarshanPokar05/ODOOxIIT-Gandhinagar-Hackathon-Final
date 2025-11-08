const salesAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const allowedRoles = ['admin', 'project_manager'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Only admin and project manager can access sales orders.' });
  }

  next();
};

module.exports = salesAuth;