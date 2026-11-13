<template>
  <div class="container page">
    <h1>Управление магазином</h1>
    <nav class="tabs">
      <RouterLink :to="{ name: 'admin-bouquets' }">Букеты</RouterLink>
      <RouterLink :to="{ name: 'stock' }">Цветы и склад</RouterLink>
      <RouterLink :to="{ name: 'admin-packagings' }">Упаковка</RouterLink>
      <RouterLink :to="{ name: 'admin-occasions' }">Поводы</RouterLink>
      <RouterLink :to="{ name: 'admin-users' }">Пользователи</RouterLink>
      <RouterLink :to="{ name: 'admin-stats' }">Отчёт</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>
