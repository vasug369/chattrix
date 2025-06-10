import React, { useEffect, useState } from 'react';
import image from '../assets/download.png';
import email_icon from '../assets/email_icon.png';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = 'https://chattrix-2.onrender.com';

function Login() {
    const [step, setStep] = useState('email');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mode, setMode] = useState('signin');

    const navigate = useNavigate();


    useEffect(() => {
        axios.get(`${BASE_URL}/api/auth/validate`, {
            withCredentials: true
        })
            .then((res) => {
                if (res.data.authenticated) {
                    navigate('/dashboard');
                }
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    const handleRegister = async () => {
        try {
            await axios.post(`${BASE_URL}/api/auth/register`, {
                name,
                email,
                password
            });
            setMode('signin');
            navigate('/');
        } catch (err) {
            console.log(err);
        }
    };

    const handleLogin = async () => {
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                email,
                password
            }, {
                withCredentials: true
            });

            navigate('/dashboard');
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <>
            {mode === 'signin' && (
                <div className='flex h-screen opacity-100'>
                    <div className='w-1/2 h-full bg-cover bg-center' style={{ backgroundImage: `url(${image})` }}></div>
                    <h2 className='title1 fixed mt-[775px] ml-[62px] text-[#ffffff] font-poppins text-5xl uppercase font-bold'>Sign in to your</h2>
                    <h2 className='title1 fixed mt-[820px] ml-[62px] text-[#501794] font-poppins text-5xl uppercase font-bold'>Adventure!</h2>

                    <div className='w-1/2 h-full bg-[#160430]'>
                        <div className="right-pane-wrapper flex flex-col">
                            <div className='title2 uppercase text-[#ffffff] ml-[181px] mt-[197px] text-5xl'>Sign in</div>
                            {step === 'email' && (
                                <>
                                    <input
                                        type="text"
                                        className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                                        placeholder="Yourname@gmail.com"
                                        style={{
                                            marginLeft: "calc(901px - 80%)",
                                            backgroundImage: `url(${email_icon})`,
                                            backgroundPosition: "10px center",
                                            backgroundRepeat: "no-repeat",
                                            backgroundSize: "24px 24px",
                                        }}
                                        onChange={(e) => setEmail(e.target.value)}
                                        value={email}
                                    />
                                    <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[40px] rounded-2xl cursor-pointer text-white text-2xl'
                                        style={{ marginLeft: "calc(901px - 80%)" }}
                                        onClick={() => setStep('password')}>Next</button>
                                </>
                            )}

                            {step === 'password' && (
                                <>
                                    <input
                                        type="password"
                                        className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                                        placeholder="Enter your password"
                                        style={{ marginLeft: "calc(901px - 80%)" }}
                                        onChange={(e) => setPassword(e.target.value)}
                                        value={password}
                                    />
                                    <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[40px] rounded-2xl cursor-pointer text-white text-2xl'
                                        style={{ marginLeft: "calc(901px - 80%)" }}
                                        onClick={() => setStep('email')}>Back</button>
                                    <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[40px] rounded-2xl cursor-pointer text-white text-2xl'
                                        style={{ marginLeft: "calc(901px - 80%)" }}
                                        onClick={handleLogin}>Sign in</button>
                                </>
                            )}
                        </div>

                        <hr className='mt-10px text-[#727272] w-[460px] mt-[60px]' style={{ marginLeft: "calc(901px - 80%)" }} />

                        <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[150px] rounded-2xl cursor-pointer text-white text-2xl'
                            onClick={() => { setMode('signup'); setStep('email'); }} style={{ marginLeft: "calc(901px - 80%)" }}>Sign Up</button>
                    </div>
                </div>
            )}

            {mode === 'signup' && (
                <div className='flex min-h-screen opacity-100'>
                    <div className='w-1/2 bg-cover bg-center' style={{ backgroundImage: `url(${image})` }}></div>
                    <h2 className='title1 fixed mt-[775px] ml-[62px] text-[#ffffff] font-poppins text-5xl uppercase font-bold'>Sign in to your</h2>
                    <h2 className='title1 fixed mt-[820px] ml-[62px] text-[#501794] font-poppins text-5xl uppercase font-bold'>Adventure!</h2>

                    <div className='w-1/2 h-full bg-[#160430]'>
                        <div className="right-pane-wrapper flex flex-col">
                            <div className='title2 uppercase text-[#ffffff] ml-[181px] mt-[197px] text-5xl'>Sign up</div>

                            <input
                                type="text"
                                className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                                placeholder="Enter your Name"
                                style={{ marginLeft: "calc(901px - 80%)" }}
                                onChange={(e) => setName(e.target.value)}
                                value={name}
                            />

                            <input
                                type="text"
                                className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                                placeholder="Enter your Email"
                                style={{
                                    marginLeft: "calc(901px - 80%)",
                                    backgroundImage: `url(${email_icon})`,
                                    backgroundPosition: "10px center",
                                    backgroundRepeat: "no-repeat",
                                    backgroundSize: "24px 24px",
                                }}
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                            />

                            <input
                                type="password"
                                className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                                placeholder="Enter your password"
                                style={{ marginLeft: "calc(901px - 80%)" }}
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                            />

                            <input
                                type="password"
                                className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                                placeholder="Confirm your password"
                                style={{ marginLeft: "calc(901px - 80%)" }}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                value={confirmPassword}
                            />

                            <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[40px] rounded-2xl cursor-pointer text-white text-2xl'
                                style={{ marginLeft: "calc(901px - 80%)" }}
                                onClick={handleRegister}>Sign up</button>
                        </div>

                        <hr className='mt-10px text-[#727272] w-[460px] mt-[60px]' style={{ marginLeft: "calc(901px - 80%)" }} />

                        <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[150px] rounded-2xl cursor-pointer text-white text-2xl'
                            style={{ marginLeft: "calc(901px - 80%)" }} onClick={() => setMode('signin')}>Back to Sign In</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Login;
