import { Link } from "react-router-dom";
import SignupForm from "@/components/auth/SignupForm";
import { Button } from "@/components/ui/button";

export default function Signup() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-secondary to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Create your account</h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <SignupForm />
        </div>

        <div className="text-center">
          <Link to="/">
            <Button variant="ghost">Back to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
