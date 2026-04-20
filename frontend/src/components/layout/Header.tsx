import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, Menu, MenuItem, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { Menu as MenuIcon, AccountCircle, Brightness4, Brightness7 } from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../../contexts/ThemeContext';

const Header: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuthContext();
    const { mode, toggleTheme } = useThemeContext();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await logout();
        handleClose();
        navigate('/login');
    };

    const handleProfile = () => {
        handleClose();
        navigate('/profile');
    };

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    CollabVerse
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
                        <IconButton onClick={toggleTheme} color="inherit">
                            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                        </IconButton>
                    </Tooltip>

                    {isAuthenticated ? (
                        <>
                            <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
                                {user?.githubUsername || user?.email}
                            </Typography>
                            <IconButton
                                size="large"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleMenu}
                                color="inherit"
                            >
                                <AccountCircle />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                                <MenuItem onClick={handleLogout}>Logout</MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
