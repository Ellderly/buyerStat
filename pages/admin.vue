<template>
  <div class="admin-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Управление</h1>
        <p class="page-subtitle">Пользователи и команды</p>
      </div>
    </header>

    <!-- Tabs -->
    <UTabs :items="tabs" class="tabs-container">
      <template #item="{ item }">
        <!-- Users Tab -->
        <div v-if="item.key === 'users'" class="tab-content">
          <div class="tab-header">
            <h2 class="tab-title">Пользователи</h2>
            <UButton icon="i-heroicons-plus" @click="openUserModal()">
              Добавить пользователя
            </UButton>
          </div>

          <div class="table-card">
            <UTable
              :rows="users"
              :columns="userColumns"
              :loading="isLoadingUsers"
            >
              <template #role-data="{ row }">
                <UBadge :color="getRoleColor(row.role)" variant="soft">
                  {{ getRoleLabel(row.role) }}
                </UBadge>
              </template>

              <template #teamName-data="{ row }">
                <UBadge v-if="row.teamName" variant="soft" color="gray">
                  {{ row.teamName }}
                </UBadge>
                <span v-else class="text-gray-500">-</span>
              </template>

              <template #createdAt-data="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>

              <template #actions-data="{ row }">
                <div class="flex gap-2">
                  <UButton
                    icon="i-heroicons-pencil"
                    size="xs"
                    variant="ghost"
                    @click="openUserModal(row)"
                  />
                  <UButton
                    icon="i-heroicons-trash"
                    size="xs"
                    variant="ghost"
                    color="red"
                    @click="confirmDeleteUser(row)"
                  />
                </div>
              </template>
            </UTable>
          </div>
        </div>

        <!-- Teams Tab -->
        <div v-if="item.key === 'teams'" class="tab-content">
          <div class="tab-header">
            <h2 class="tab-title">Команды</h2>
            <UButton icon="i-heroicons-plus" @click="openTeamModal()">
              Добавить команду
            </UButton>
          </div>

          <div class="teams-grid">
            <div v-for="team in teams" :key="team.id" class="team-card">
              <div class="team-info">
                <UIcon name="i-heroicons-user-group" class="team-icon" />
                <div class="flex-1">
                  <h3 class="team-name">{{ team.name }}</h3>
                  <p class="team-count">{{ team.usersCount }} пользователей</p>
                </div>
                <UButton
                  icon="i-heroicons-trash"
                  size="xs"
                  variant="ghost"
                  color="red"
                  @click="confirmDeleteTeam(team)"
                />
              </div>
            </div>
            <div v-if="teams.length === 0" class="empty-state">
              Команды не найдены
            </div>
          </div>
        </div>
      </template>
    </UTabs>

    <!-- User Modal -->
    <UModal v-model="isUserModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ editingUserId ? 'Редактировать пользователя' : 'Новый пользователь' }}
          </h3>
        </template>

        <form class="space-y-4">
          <UFormGroup label="Имя" required>
            <UInput v-model="userForm.name" placeholder="Имя пользователя" />
          </UFormGroup>

          <UFormGroup label="Логин" required>
            <UInput v-model="userForm.username" placeholder="Логин пользователя" />
          </UFormGroup>

          <UFormGroup :label="editingUserId ? 'Новый пароль' : 'Пароль'" :required="!editingUserId">
            <UInput 
              v-model="userForm.password" 
              type="password" 
              :placeholder="editingUserId ? 'Оставьте пустым чтобы не менять' : 'Пароль'"
            />
          </UFormGroup>

          <UFormGroup label="Роль" required>
            <USelectMenu
              v-model="userForm.role"
              :options="roleOptions"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormGroup>

          <UFormGroup label="Команда">
            <USelectMenu
              v-model="userForm.teamId"
              :options="teamOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="Выберите команду"
            />
          </UFormGroup>
        </form>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isUserModalOpen = false">Отмена</UButton>
            <UButton @click="saveUser" :loading="isSaving">
              {{ editingUserId ? 'Сохранить' : 'Создать' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Team Modal -->
    <UModal v-model="isTeamModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Новая команда</h3>
        </template>

        <UFormGroup label="Название команды" required>
          <UInput v-model="teamName" placeholder="Team Alpha" />
        </UFormGroup>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isTeamModalOpen = false">Отмена</UButton>
            <UButton @click="createTeam" :loading="isSavingTeam">Создать</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model="isDeleteModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-500">Удалить пользователя?</h3>
        </template>
        <p class="text-gray-400">
          Все данные этого пользователя будут удалены. Это действие нельзя отменить.
        </p>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isDeleteModalOpen = false">Отмена</UButton>
            <UButton color="red" @click="deleteUser" :loading="isDeleting">Удалить</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Team Confirmation -->
    <UModal v-model="isDeleteTeamModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-500">Удалить команду?</h3>
        </template>
        <p class="text-gray-400">
          Связи пользователей с командой будут удалены, но сами пользователи и их статистика сохранятся.
        </p>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isDeleteTeamModalOpen = false">Отмена</UButton>
            <UButton color="red" @click="deleteTeam">Удалить</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

interface User {
  id: number
  username: string
  name: string
  role: string
  teamId: number | null
  teamName: string | null
  createdAt: string
}

interface Team {
  id: number
  name: string
  usersCount: number
}

const toast = useToast()

// State
const users = ref<User[]>([])
const teams = ref<Team[]>([])
const isLoadingUsers = ref(false)
const isUserModalOpen = ref(false)
const isTeamModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isSaving = ref(false)
const isSavingTeam = ref(false)
const isDeleting = ref(false)
const editingUserId = ref<number | null>(null)
const deletingUserId = ref<number | null>(null)
const teamName = ref('')

const userForm = reactive({
  name: '',
  username: '',
  password: '',
  role: 'BUYER',
  teamId: undefined as number | undefined
})

// Tabs
const tabs = [
  { key: 'users', label: 'Пользователи', icon: 'i-heroicons-users' },
  { key: 'teams', label: 'Команды', icon: 'i-heroicons-user-group' }
]

// Users table columns
const userColumns = [
  { key: 'name', label: 'Имя' },
  { key: 'username', label: 'Логин' },
  { key: 'role', label: 'Роль' },
  { key: 'teamName', label: 'Команда' },
  { key: 'createdAt', label: 'Создан' },
  { key: 'actions', label: '' }
]

// Options
const roleOptions = [
  { label: 'Байер', value: 'BUYER' },
  { label: 'Тимлид', value: 'TEAMLEAD' },
  { label: 'Админ', value: 'ADMIN' }
]

const teamOptions = computed(() =>
  teams.value.map(t => ({ label: t.name, value: t.id }))
)

// Methods
function getRoleColor(role: string): 'blue' | 'purple' | 'red' | 'gray' {
  const colors: Record<string, 'blue' | 'purple' | 'red' | 'gray'> = {
    BUYER: 'blue',
    TEAMLEAD: 'purple',
    ADMIN: 'red'
  }
  return colors[role] || 'gray'
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    BUYER: 'Байер',
    TEAMLEAD: 'Тимлид',
    ADMIN: 'Админ'
  }
  return labels[role] || role
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

async function fetchUsers() {
  isLoadingUsers.value = true
  try {
    const response = await $fetch('/api/users')
    users.value = response.users
  } catch (error: any) {
    if (error.statusCode === 403) {
      toast.add({ title: 'Доступ запрещен', color: 'red' })
      await navigateTo('/dashboard')
    }
  } finally {
    isLoadingUsers.value = false
  }
}

async function fetchTeams() {
  try {
    const response = await $fetch('/api/teams')
    teams.value = response.teams
  } catch (error) {
    console.error('Failed to fetch teams')
  }
}

function openUserModal(user?: User) {
  if (user) {
    editingUserId.value = user.id
    userForm.name = user.name
    userForm.username = user.username
    userForm.password = ''
    userForm.role = user.role
    userForm.teamId = user.teamId || undefined
  } else {
    editingUserId.value = null
    userForm.name = ''
    userForm.username = ''
    userForm.password = ''
    userForm.role = 'BUYER'
    userForm.teamId = undefined
  }
  isUserModalOpen.value = true
}

async function saveUser() {
  isSaving.value = true
  try {
    if (editingUserId.value) {
      const data: any = { ...userForm }
      // Convert undefined back to null for API if needed, mostly for semantic consistency
      if (data.teamId === undefined) data.teamId = null
      if (!data.password) delete data.password
      await $fetch(`/api/users/${editingUserId.value}`, {
        method: 'PUT',
        body: data
      })
      toast.add({ title: 'Пользователь обновлен', color: 'green' })
    } else {
      await $fetch('/api/users', {
        method: 'POST',
        body: {
          ...userForm,
          teamId: userForm.teamId === undefined ? null : userForm.teamId
        }
      })
      toast.add({ title: 'Пользователь создан', color: 'green' })
    }
    isUserModalOpen.value = false
    fetchUsers()
  } catch (error: any) {
    toast.add({ title: error.data?.message || 'Ошибка', color: 'red' })
  } finally {
    isSaving.value = false
  }
}

function confirmDeleteUser(user: User) {
  deletingUserId.value = user.id
  isDeleteModalOpen.value = true
}

async function deleteUser() {
  if (!deletingUserId.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/users/${deletingUserId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Пользователь удален', color: 'green' })
    isDeleteModalOpen.value = false
    fetchUsers()
  } catch (error: any) {
    toast.add({ title: error.data?.message || 'Ошибка', color: 'red' })
  } finally {
    isDeleting.value = false
  }
}

function openTeamModal() {
  teamName.value = ''
  isTeamModalOpen.value = true
}

async function createTeam() {
  if (!teamName.value) return
  isSavingTeam.value = true
  try {
    await $fetch('/api/teams', {
      method: 'POST',
      body: { name: teamName.value }
    })
    toast.add({ title: 'Команда создана', color: 'green' })
    isTeamModalOpen.value = false
    fetchTeams()
  } catch (error: any) {
    toast.add({ title: error.data?.message || 'Ошибка', color: 'red' })
  } finally {
    isSavingTeam.value = false
  }
}

const isDeleteTeamModalOpen = ref(false)
const deletingTeamId = ref<number | null>(null)

function confirmDeleteTeam(team: Team) {
  deletingTeamId.value = team.id
  isDeleteTeamModalOpen.value = true
}

async function deleteTeam() {
  if (!deletingTeamId.value) return
  const isDeletingTeam = ref(false)
  isDeletingTeam.value = true
  try {
    await $fetch(`/api/teams/${deletingTeamId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Команда удалена', color: 'green' })
    isDeleteTeamModalOpen.value = false
    fetchTeams()
    fetchUsers()
  } catch (error: any) {
    toast.add({ title: error.data?.message || 'Ошибка', color: 'red' })
  } finally {
    isDeletingTeam.value = false
  }
}

// Initialize
onMounted(() => {
  fetchUsers()
  fetchTeams()
})
</script>

<style scoped>
.admin-page {
  color: #e2e8f0;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: #64748b;
  margin-top: 0.25rem;
}

.tabs-container {
  margin-bottom: 1.5rem;
}

.tab-content {
  padding-top: 1.5rem;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tab-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.table-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.team-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.team-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
}

.team-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.team-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: #6366f1;
}

.team-name {
  font-size: 1.125rem;
  font-weight: 600;
}

.team-count {
  color: #64748b;
  font-size: 0.875rem;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #64748b;
  padding: 3rem;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }
  
  .tab-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .tab-header button {
    width: 100%;
    justify-content: center;
  }
  
  .tab-title {
    font-size: 1.125rem;
  }
  
  .tab-content {
    padding-top: 1rem;
  }
  
  .table-card {
    padding: 0.75rem;
    margin-left: -1rem;
    margin-right: -1rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .table-card :deep(table) {
    font-size: 0.75rem;
  }
  
  .table-card :deep(th),
  .table-card :deep(td) {
    padding: 0.5rem 0.375rem;
    white-space: nowrap;
  }
  
  .teams-grid {
    grid-template-columns: 1fr;
  }
  
  .team-card {
    padding: 1rem;
  }
  
  .team-icon {
    width: 2rem;
    height: 2rem;
  }
  
  .team-name {
    font-size: 1rem;
  }
  
  .team-count {
    font-size: 0.75rem;
  }
}
</style>
