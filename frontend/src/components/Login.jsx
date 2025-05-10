import React from 'react'
import image from '../assets/download.png'
import email_icon from '../assets/email_icon.png'

function Login() {
    return (
        <>
            <div className='flex h-screen opacity-100'>

                <div className='w-1/2 h-full bg-cover bg-center' style={{ backgroundImage: `url(${image})` }}></div>


                <h2 className='title1 fixed mt-[775px] ml-[62px] text-[#ffffff] font-poppins text-5xl uppercase font-bold'>Sign in to your</h2>
                <h2 className='title1 fixed mt-[820px] ml-[62px] text-[#501794] font-poppins text-5xl uppercase font-bold'>Adventure!</h2>

                <div className='w-1/2 h-full bg-[#160430]' >
                    <div className="right-pane-wrapper flex flex-col">

                        <div className='title2 uppercase text-[#ffffff] ml-[181px] mt-[197px] text-5xl' >Sign in</div>
                        <input
                            type="text"
                            className="w-[460px] h-[68.94px] bg-[#261046] mt-[30px] rounded-2xl pl-[60px] text-2xl text-white placeholder-white"
                            placeholder="Yourname@gmail.com"
                            style={{
                                marginLeft: "calc(901px - 80%)",
                                backgroundImage: `url(${email_icon})`,
                                backgroundPosition: "10px center", // Adjust for positioning the icon
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "24px 24px", // Resize the icon if needed
                            }}
                            />

                        <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[40px] rounded-2xl cursor-pointer text-white text-2xl' style={{ marginLeft: "calc(901px - 80%)" }}>Sign In</button>
                    </div>



                    <hr className='  mt-10px text-[#727272] w-[460px] mt-[60px]' style={{
                        marginLeft: "calc(901px - 80%)"
                    }} />


                    <button className='w-[460px] h-[62.67px] bg-gradient-to-r from-[#501794] to-[#3E70A1] mt-[40px] rounded-2xl cursor-pointer text-white text-2xl' style={{ marginLeft: "calc(901px - 80%)" }}>Sign Up</button>





                </div>



            </div>
            </>
    )
}

export default Login
