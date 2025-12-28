export default defineEventHandler((event) => {
  deleteCookie(event, 'auth_session')
  
  return {
    success: true,
    message: 'Logged out successfully'
  }
})
