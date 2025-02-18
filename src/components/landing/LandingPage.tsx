import React from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Calendar className="h-6 w-6 text-primary" />,
      title: "Smart Scheduling",
      description:
        "Efficiently manage patient appointments and reduce wait times",
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Patient Management",
      description: "Comprehensive patient records and history tracking",
    },
    {
      icon: <ClipboardList className="h-6 w-6 text-primary" />,
      title: "Digital Records",
      description: "Secure, accessible electronic health records system",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-white">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary">MediFlow</span>
            </div>
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="mr-2"
              >
                Log in
              </Button>
              <Button onClick={() => navigate("/signup")}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Streamline Your Medical Practice
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Efficient patient management system designed for modern healthcare
              practices.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white/50 backdrop-blur-sm py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Features</h2>
              <p className="mt-4 text-lg text-gray-500">
                Everything you need to manage your practice efficiently
              </p>
            </div>

            <div className="mt-20">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="relative p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
                      {feature.icon}
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-base text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">
                Why Choose Us
              </h2>
            </div>

            <div className="mt-10">
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Easy to use interface",
                  "Secure patient data",
                  "24/7 customer support",
                  "Regular updates",
                  "Customizable workflows",
                  "Affordable pricing",
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start lg:col-span-1">
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700">{benefit}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-500">
            © 2024 MediFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
