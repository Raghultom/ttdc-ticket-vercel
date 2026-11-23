import { zodResolver } from '@hookform/resolvers/zod';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ROLES } from '../../constants/roles';
import * as usersApi from '../../services/api/users';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/models';
import {
  subAdminManagerSchema,
  subAdminSchema,
  type SubAdminFormValues,
  type SubAdminManagerFormValues,
} from '../../utils/validators';
import { passwordFromName, slugifyName } from '../../utils/autoFill';

const emptyCreateDefaults: SubAdminManagerFormValues = {
  name: '',
  username: '',
  password: '',
  mobile: '',
  email: '',
  active: true,
};

export default function SubAdmins() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const usernameTouchedRef = useRef(false);
  const passwordTouchedRef = useRef(false);

  const loadUsers = useCallback(async () => {
    setUsers(await usersApi.list());
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const subAdmins = useMemo(() => users.filter((u) => u.role === ROLES.SUB_ADMIN), [users]);

  const createForm = useForm<SubAdminManagerFormValues>({
    resolver: zodResolver(subAdminManagerSchema),
    defaultValues: emptyCreateDefaults,
  });

  const editForm = useForm<SubAdminFormValues>({
    resolver: zodResolver(subAdminSchema),
    defaultValues: { name: '', mobile: '', email: '', active: true },
  });

  const openCreate = () => {
    createForm.reset(emptyCreateDefaults);
    usernameTouchedRef.current = false;
    passwordTouchedRef.current = false;
    setError(null);
    setCreateOpen(true);
  };

  const submitCreate = async (values: SubAdminManagerFormValues) => {
    if (!currentUser) return;
    setError(null);
    try {
      await usersApi.create({
        name: values.name,
        username: values.username,
        password: values.password,
        role: ROLES.SUB_ADMIN,
        counterIds: [],
        mobile: values.mobile ?? '',
        email: values.email ?? '',
        active: values.active,
        createdBy: currentUser.id,
      });
      await loadUsers();
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const openEdit = (user: User) => {
    editForm.reset({ name: user.name, mobile: user.mobile, email: user.email, active: user.active });
    setEditTarget(user);
  };

  const submitEdit = async (values: SubAdminFormValues) => {
    if (!editTarget) return;
    await usersApi.update(editTarget.id, {
      name: values.name,
      mobile: values.mobile ?? '',
      email: values.email ?? '',
      active: values.active,
    });
    await loadUsers();
    setEditTarget(null);
  };

  const submitReset = async () => {
    if (!resetTarget || newPassword.length < 4) return;
    await usersApi.resetPassword(resetTarget.id, newPassword);
    setResetTarget(null);
    setNewPassword('');
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">{t('subAdmins.title')}</Typography>
        <Button startIcon={<PersonAddIcon />} variant="contained" onClick={openCreate}>
          {t('subAdmins.createSubAdmin')}
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('common.username')}</TableCell>
              <TableCell>{t('common.mobile')}</TableCell>
              <TableCell>{t('common.email')}</TableCell>
              <TableCell>{t('common.active')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subAdmins.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.mobile || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.active}
                    size="small"
                    onChange={async () => {
                      await usersApi.update(user.id, { active: !user.active });
                      await loadUsers();
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => openEdit(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('eventDetail.resetPassword')}>
                    <IconButton size="small" onClick={() => setResetTarget(user)}>
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {subAdmins.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t('subAdmins.noSubAdminsYet')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Create Sub Admin */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('subAdmins.createSubAdmin')}</DialogTitle>
        <Box component="form" onSubmit={createForm.handleSubmit(submitCreate)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('common.name')}
                fullWidth
                error={!!createForm.formState.errors.name}
                helperText={createForm.formState.errors.name?.message && t(createForm.formState.errors.name.message)}
                {...createForm.register('name', {
                  onChange: (e) => {
                    const name = e.target.value;
                    if (!usernameTouchedRef.current) createForm.setValue('username', slugifyName(name));
                    if (!passwordTouchedRef.current) createForm.setValue('password', passwordFromName(name));
                  },
                })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('common.username')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!createForm.formState.errors.username}
                  helperText={
                    createForm.formState.errors.username?.message && t(createForm.formState.errors.username.message)
                  }
                  {...createForm.register('username', { onChange: () => { usernameTouchedRef.current = true; } })}
                />
                <TextField
                  label={t('common.password')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!createForm.formState.errors.password}
                  helperText={
                    createForm.formState.errors.password?.message && t(createForm.formState.errors.password.message)
                  }
                  {...createForm.register('password', { onChange: () => { passwordTouchedRef.current = true; } })}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('common.mobile')}
                  fullWidth
                  error={!!createForm.formState.errors.mobile}
                  helperText={
                    createForm.formState.errors.mobile?.message && t(createForm.formState.errors.mobile.message)
                  }
                  {...createForm.register('mobile')}
                />
                <TextField
                  label={t('common.email')}
                  fullWidth
                  error={!!createForm.formState.errors.email}
                  helperText={
                    createForm.formState.errors.email?.message && t(createForm.formState.errors.email.message)
                  }
                  {...createForm.register('email')}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={createForm.formState.isSubmitting}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Sub Admin */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('subAdmins.editSubAdmin')}</DialogTitle>
        <Box component="form" onSubmit={editForm.handleSubmit(submitEdit)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label={t('common.name')} fullWidth {...editForm.register('name')} />
              <TextField label={t('common.mobile')} fullWidth {...editForm.register('mobile')} />
              <TextField label={t('common.email')} fullWidth {...editForm.register('email')} />
              <Controller
                name="active"
                control={editForm.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                    label={t('common.active')}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('eventDetail.resetPassword')} — {resetTarget?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t('eventDetail.newPassword')}
            fullWidth
            sx={{ mt: 1 }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText={t('eventDetail.passwordHelper')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" disabled={newPassword.length < 4} onClick={submitReset}>
            {t('eventDetail.reset')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
