"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import styled from "styled-components";
import { CustomUser as User} from "@/src/interface/user";
import { API_ROUTES } from "@/src/config/api-routes";

export default function DashboardPage() {
  const { id } = useParams();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(API_ROUTES.users.crud.get(id as string));
        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
        } else {
          console.error("Error fetching user:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    }
    fetchUser();
  }, [id]);

  useEffect(() => {
  }, [userInfo]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

 
  if (!userInfo.id) {
    console.log("user not found", userInfo);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Datos del usuario no disponibles</p>
      </div>
    );
  }

  
  const user = userInfo;

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <StyledWrapper>
            <label className="container mt-14">
              <input
                defaultChecked={true}
                type="checkbox"
                onClick={() => router.push("/admin/users")}
                onChange={() => setIsOpen(!isOpen)}
              />
              <svg
                viewBox="0 0 320 512"
                height="1em"
                xmlns="http://www.w3.org/2000/svg"
                className="chevron-right fill-white"
              >
                <path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
              </svg>
            </label>
          </StyledWrapper>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-[#161B22] rounded-lg p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar Section */}
                <div className="md:w-1/4">
                  <div className="relative">
                    <Image
                      src={user?.image || "/images/default_periodico.jpg"}
                      alt={user?.name || "Avatar"}
                      width={260}
                      height={260}
                      className="rounded-full border-4 border-blue-500"
                    />
                  </div>
                </div>

                {/* User Info Section */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-4">
                    {user?.name || "Nombre del usuario"}
                  </h1>
                  <div className="text-gray-400 mb-6">
                    @{user?.username || "username"}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-300">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z" />
                      </svg>
                      {user?.email || "email@example.com"}
                    </div>
                    <div className="flex items-center text-gray-300">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                      </svg>
                      {user?.role || "Usuario"}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-white mb-4">
                      Periódicos suscritos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {["Repo 1", "Repo 2", "Repo 3", "Repo 4"].map(
                        (repo, index) => (
                          <div
                            key={index}
                            className="p-4 bg-[#21262D] rounded-lg border border-gray-700"
                          >
                            <h3 className="text-blue-400 font-medium mb-2">
                              {repo}
                            </h3>
                            <p className="text-gray-400 text-sm">Público</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const StyledWrapper = styled.div`
  /*------ Settings ------*/
  .container {
    --color: #a5a5b0;
    --size: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    cursor: pointer;
    font-size: var(--size);
    user-select: none;
    fill: var(--color);
  }

  .container .chevron-right {
    position: absolute;
    animation: keyframes-return 0.5s backwards;
  }

  /* ------ On check event ------ */
  .container input:checked ~ .chevron-right {
    animation: keyframes-rotate 0.5s backwards;
    transform: rotate(180deg);
  }

  /* ------ Hide the default checkbox ------ */
  .container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  /* ------ Animation ------ */
  @keyframes keyframes-rotate {
    0% {
      transform: rotate(0deg);
      opacity: 0;
    }

    100% {
      transform: rotate(180deg);
    }
  }

  @keyframes keyframes-return {
    0% {
      transform: rotate(180deg);
      opacity: 0;
    }

    100% {
      transform: rotate(0deg);
    }
  }
  .Btn {
    --black: #000000;
    --ch-black: #141414;
    --eer-black: #1b1b1b;
    --night-rider: #2e2e2e;
    --white: #ffffff;
    --af-white: #f3f3f3;
    --ch-white: #e1e1e1;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 45px;
    height: 45px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition-duration: 0.3s;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.199);
    background-color: var(--night-rider);
  }

  /* plus sign */
  .sign {
    width: 100%;
    transition-duration: 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sign svg {
    width: 17px;
  }

  .sign svg path {
    fill: var(--af-white);
  }
  /* text */
  .text {
    position: absolute;
    right: 0%;
    width: 0%;
    opacity: 0;
    color: var(--af-white);
    font-size: 1.2em;
    font-weight: 600;
    transition-duration: 0.3s;
  }
  /* hover effect on button width */
  .Btn:hover {
    width: 125px;
    border-radius: 5px;
    transition-duration: 0.3s;
  }

  .Btn:hover .sign {
    width: 30%;
    transition-duration: 0.3s;
    padding-left: 20px;
  }
  /* hover effect button's text */
  .Btn:hover .text {
    opacity: 1;
    width: 70%;
    transition-duration: 0.3s;
    padding-right: 10px;
  }
  /* button click effect*/
  .Btn:active {
    transform: translate(2px, 2px);
  }
`;
