import { API } from "./api";


export const loginTech = (name, pin)=> API.post("/technicians/login",{name,pin});
