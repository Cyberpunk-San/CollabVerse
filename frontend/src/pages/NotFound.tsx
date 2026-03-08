import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
    const navigate = useNavigate();
    return (
        <Container sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="h2" color="primary" gutterBottom>
                404
            </Typography>
            <Typography variant="h5" color="text.secondary" paragraph>
                Oops! The page you were looking for doesn't exist.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
                Go to Dashboard
            </Button>
        </Container>
    );
};

export default NotFound;
