// Azure Functions entry point
// All function handlers are registered in their respective files using app.http()

export * from './functions/createRating';
export * from './functions/updateRating';
export * from './functions/getRating';
export * from './functions/deleteRating';
export * from './functions/getUserRatings';
export * from './functions/getRatingByMovie';
export * from './functions/getUserStats';
export * from './functions/getFavorites';
export * from './functions/getWatchlist';
export * from './functions/health';
